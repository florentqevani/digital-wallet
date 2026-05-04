import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:mobile_frontend/core/network/api_client.dart';
import 'package:mobile_frontend/core/storage/session_store.dart';

class ActivityEntry {
  ActivityEntry({
    required this.id,
    required this.actorId,
    required this.action,
    required this.status,
    required this.message,
    required this.timestamp,
  });

  final String id;
  final String actorId;
  final String action;
  final String status;
  final String message;
  final DateTime timestamp;

  factory ActivityEntry.fromJson(Map<String, dynamic> json) {
    final rawTimestamp = (json['timestamp'] ?? 0).toString();
    final millis = int.tryParse(rawTimestamp) ?? 0;
    return ActivityEntry(
      id: (json['id'] ?? '').toString(),
      actorId: (json['actor_id'] ?? '').toString(),
      action: (json['action'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        millis,
        isUtc: true,
      ).toLocal(),
    );
  }
}

class AuthController extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final SessionStore _sessionStore = SessionStore();

  bool _busy = false;
  bool _logsBusy = false;
  String? _error;
  String _token = '';
  String _role = '';
  String _email = '';
  double _balance = 0.0;
  String _currency = 'ALL';
  List<String> _permissions = <String>[];
  List<ActivityEntry> _recentActivity = <ActivityEntry>[];
  int _logsPage = 1;
  bool _hasMoreLogs = true;

  bool get isBusy => _busy;
  bool get isLogsBusy => _logsBusy;
  bool get hasMoreLogs => _hasMoreLogs;
  bool get isAuthenticated => _token.isNotEmpty;
  String? get error => _error;
  String get role => _role;
  String get email => _email;
  double get balance => _balance;
  String get currency => _currency;
  List<String> get permissions => List.unmodifiable(_permissions);
  List<ActivityEntry> get recentActivity => List.unmodifiable(_recentActivity);

  Future<void> loadSession() async {
    final saved = await _sessionStore.read();
    if (saved == null || saved.token.isEmpty) {
      return;
    }

    _token = saved.token;
    _role = saved.role;
    _email = saved.email;
    _permissions = List<String>.from(saved.permissions);
    notifyListeners();
    await fetchLogs(refresh: false);
    await fetchBalance();
  }

  Future<bool> register({
    required String email,
    required String password,
    required String name,
  }) async {
    _setBusy(true);
    _setError(null);

    try {
      final response = await _apiClient.post(
        '/api/auth/register',
        body: {'email': email, 'password': password, 'name': name},
      );

      if (response['success'] == true) {
        final token = (response['token'] ?? '').toString();
        if (token.isNotEmpty) {
          _token = token;
          _role = (response['role'] ?? 'client').toString();
          _email = email;
          _permissions =
              ((response['permissions'] ?? <dynamic>[]) as List<dynamic>)
                  .map((e) => e.toString())
                  .toList();
          _recentActivity = <ActivityEntry>[];

          await _sessionStore.save(
            SessionData(
              token: _token,
              role: _role,
              email: _email,
              permissions: _permissions,
            ),
          );

          notifyListeners();
          return true;
        }

        return await login(email: email, password: password);
      }

      _setError((response['message'] ?? 'Registration failed').toString());
      return false;
    } catch (e) {
      _setError(_messageFromError(e));
      return false;
    } finally {
      _setBusy(false);
    }
  }

  Future<bool> login({required String email, required String password}) async {
    _setBusy(true);
    _setError(null);

    try {
      final response = await _apiClient.post(
        '/api/auth/login',
        body: {'email': email, 'password': password},
      );

      if (response['success'] == false) {
        _setError((response['message'] ?? 'Login failed').toString());
        return false;
      }

      final token = (response['token'] ?? '').toString();
      if (token.isEmpty) {
        _setError((response['message'] ?? 'Login failed').toString());
        return false;
      }

      _token = token;
      _role = (response['role'] ?? '').toString();
      _email = email;
      _permissions = ((response['permissions'] ?? <dynamic>[]) as List<dynamic>)
          .map((e) => e.toString())
          .toList();
      _logsPage = 1;
      _hasMoreLogs = true;
      _recentActivity =
          ((response['recentActivity'] ?? <dynamic>[]) as List<dynamic>)
              .whereType<Map<String, dynamic>>()
              .map(ActivityEntry.fromJson)
              .toList();

      await _sessionStore.save(
        SessionData(
          token: _token,
          role: _role,
          email: _email,
          permissions: _permissions,
        ),
      );

      notifyListeners();
      unawaited(fetchBalance());
      return true;
    } catch (e) {
      _setError(_messageFromError(e));
      return false;
    } finally {
      _setBusy(false);
    }
  }

  Future<void> logout() async {
    _token = '';
    _role = '';
    _email = '';
    _balance = 0.0;
    _currency = 'ALL';
    _permissions = <String>[];
    _recentActivity = <ActivityEntry>[];
    _logsPage = 1;
    _hasMoreLogs = true;
    _setError(null);
    await _sessionStore.clear();
    notifyListeners();
  }

  /// Fetches the client's own balance from the BFF.
  Future<void> fetchBalance() async {
    if (_token.isEmpty) return;
    try {
      final response = await _apiClient.get('/api/balance', token: _token);
      _balance = ((response['balance'] ?? 0) as num).toDouble();
      _currency = (response['currency'] ?? 'ALL').toString();
      notifyListeners();
    } catch (e) {
      // If the token is rejected (401), the stored session is invalid — clear it.
      if (e is ApiException && e.statusCode == 401) {
        await logout();
      }
    }
  }

  /// Deposits [amount] into the client's own balance.
  /// Returns null on success (balance updated), or an error message string.
  Future<String?> addMoney(double amount) async {
    if (_token.isEmpty) return 'Not authenticated';
    try {
      final response = await _apiClient.post(
        '/api/balance/add',
        body: {'amount': amount},
        token: _token,
      );
      if (response['success'] == true) {
        _balance = ((response['balance'] ?? _balance) as num).toDouble();
        notifyListeners();
        return null;
      }
      return (response['message'] ?? 'Failed to add money').toString();
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await logout();
        return 'Session expired. Please log in again.';
      }
      return _messageFromError(e);
    }
  }

  /// Initiates a RaiAccept payment to top up balance by [amount] ALL.
  /// Returns a map with `paymentFormUrl` and `raiOrderId` on success, or null on error.
  Future<Map<String, String>?> initiatePayment(double amount) async {
    if (_token.isEmpty) return null;
    _setBusy(true);
    _setError(null);
    try {
      final response = await _apiClient.post(
        '/api/payments/initiate',
        body: {'amount': amount},
        token: _token,
      );
      final url = (response['paymentFormUrl'] ?? '').toString();
      final orderId = (response['raiOrderId'] ?? '').toString();
      if (url.isEmpty || orderId.isEmpty) {
        _setError('Invalid payment response from server.');
        return null;
      }
      return {'paymentFormUrl': url, 'raiOrderId': orderId};
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await logout();
        _setError('Session expired. Please log in again.');
      } else {
        _setError(_messageFromError(e));
      }
      return null;
    } finally {
      _setBusy(false);
    }
  }

  /// Confirms a completed RaiAccept payment and credits balance.
  /// Returns null on success (balance updated in state), or an error message.
  Future<String?> confirmPayment(String raiOrderId, double amount) async {
    if (_token.isEmpty) return 'Not authenticated';
    try {
      final response = await _apiClient.post(
        '/api/payments/confirm',
        body: {'raiOrderId': raiOrderId, 'amount': amount},
        token: _token,
      );
      if (response['success'] == true) {
        _balance = ((response['balance'] ?? _balance) as num).toDouble();
        notifyListeners();
        return null;
      }
      return (response['message'] ?? 'Payment confirmation failed').toString();
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await logout();
        return 'Session expired. Please log in again.';
      }
      return _messageFromError(e);
    }
  }

  /// Fetches the client's own logs from the BFF.
  /// [refresh] = true resets to page 1 and replaces the list.
  /// [refresh] = false appends the next page (load more).
  Future<void> fetchLogs({bool refresh = false}) async {
    if (_token.isEmpty) return;
    if (_logsBusy) return;
    if (!refresh && !_hasMoreLogs) return;

    _logsBusy = true;
    notifyListeners();

    try {
      final page = refresh ? 1 : _logsPage;
      final response = await _apiClient.get(
        '/api/logs',
        token: _token,
        query: {'page': '$page', 'limit': '20'},
      );

      final fetched = ((response['logs'] ?? <dynamic>[]) as List<dynamic>)
          .whereType<Map<String, dynamic>>()
          .map(ActivityEntry.fromJson)
          .toList();

      if (refresh) {
        _recentActivity = fetched;
        _logsPage = 1;
      } else {
        _recentActivity = List<ActivityEntry>.from(_recentActivity)
          ..addAll(fetched);
      }

      _hasMoreLogs = fetched.length >= 20;
      _logsPage = page + 1;
    } catch (e) {
      // Silently fail — don't disrupt the UI for a background fetch
    } finally {
      _logsBusy = false;
      notifyListeners();
    }
  }

  void clearError() {
    _setError(null);
  }

  void _setBusy(bool value) {
    _busy = value;
    notifyListeners();
  }

  void _setError(String? value) {
    _error = value;
    notifyListeners();
  }

  String _messageFromError(Object error) {
    final message = error.toString();
    if (message.startsWith('ApiException: ')) {
      return message.substring('ApiException: '.length);
    }
    return message;
  }
}
