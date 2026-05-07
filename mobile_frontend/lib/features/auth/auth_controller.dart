import 'dart:async';
import 'dart:convert';

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

class TransactionEntry {
  TransactionEntry({
    required this.id,
    required this.fromClientId,
    required this.toClientId,
    required this.fromEmail,
    required this.toEmail,
    required this.amount,
    required this.currency,
    required this.type,
    required this.status,
    required this.note,
    required this.createdAt,
  });

  final String id;
  final String fromClientId;
  final String toClientId;
  final String fromEmail;
  final String toEmail;
  final double amount;
  final String currency;
  final String type;
  final String status;
  final String note;
  final DateTime createdAt;

  bool get isCredit => fromClientId.isEmpty;

  factory TransactionEntry.fromJson(Map<String, dynamic> json) {
    final rawTimestamp = (json['created_at'] ?? 0).toString();
    final millis = int.tryParse(rawTimestamp) ?? 0;
    return TransactionEntry(
      id: (json['id'] ?? '').toString(),
      fromClientId: (json['from_client_id'] ?? '').toString(),
      toClientId: (json['to_client_id'] ?? '').toString(),
      fromEmail: (json['from_email'] ?? '').toString(),
      toEmail: (json['to_email'] ?? '').toString(),
      amount: ((json['amount'] ?? 0) as num).toDouble(),
      currency: (json['currency'] ?? 'ALL').toString(),
      type: (json['type'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      note: (json['note'] ?? '').toString(),
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        millis,
        isUtc: true,
      ).toLocal(),
    );
  }
}

class CreditRequest {
  CreditRequest({
    required this.id,
    required this.requesterId,
    required this.payerId,
    required this.requesterEmail,
    required this.payerEmail,
    required this.amount,
    required this.currency,
    required this.note,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String requesterId;
  final String payerId;
  final String requesterEmail;
  final String payerEmail;
  final double amount;
  final String currency;
  final String note;
  final String status;
  final DateTime createdAt;

  factory CreditRequest.fromJson(Map<String, dynamic> json) {
    final rawTs = (json['created_at'] ?? 0).toString();
    final millis = int.tryParse(rawTs) ?? 0;
    return CreditRequest(
      id: (json['id'] ?? '').toString(),
      requesterId: (json['requester_id'] ?? '').toString(),
      payerId: (json['payer_id'] ?? '').toString(),
      requesterEmail: (json['requester_email'] ?? '').toString(),
      payerEmail: (json['payer_email'] ?? '').toString(),
      amount: ((json['amount'] ?? 0) as num).toDouble(),
      currency: (json['currency'] ?? 'ALL').toString(),
      note: (json['note'] ?? '').toString(),
      status: (json['status'] ?? 'PENDING').toString(),
      createdAt: DateTime.fromMillisecondsSinceEpoch(
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
  bool _txBusy = false;
  String? _error;
  String _token = '';
  String _clientId = '';
  String _name = '';
  String _role = '';
  String _email = '';
  double _balance = 0.0;
  String _currency = 'ALL';
  List<String> _permissions = <String>[];
  List<ActivityEntry> _recentActivity = <ActivityEntry>[];
  List<TransactionEntry> _transactions = <TransactionEntry>[];
  int _logsPage = 1;
  bool _hasMoreLogs = true;
  bool _requestsBusy = false;
  List<CreditRequest> _incomingRequests = <CreditRequest>[];
  List<CreditRequest> _outgoingRequests = <CreditRequest>[];

  bool get isBusy => _busy;
  bool get isLogsBusy => _logsBusy;
  bool get isTxBusy => _txBusy;
  bool get hasMoreLogs => _hasMoreLogs;
  bool get isAuthenticated => _token.isNotEmpty;
  String? get error => _error;
  String get clientId => _clientId;
  String get role => _role;
  String get name => _name.isNotEmpty ? _name : _email.split('@').first;
  String get email => _email;
  double get balance => _balance;
  String get currency => _currency;
  List<String> get permissions => List.unmodifiable(_permissions);
  List<ActivityEntry> get recentActivity => List.unmodifiable(_recentActivity);
  List<TransactionEntry> get transactions => List.unmodifiable(_transactions);
  bool get isRequestsBusy => _requestsBusy;
  List<CreditRequest> get incomingRequests =>
      List.unmodifiable(_incomingRequests);
  List<CreditRequest> get outgoingRequests =>
      List.unmodifiable(_outgoingRequests);

  Future<void> loadSession() async {
    final saved = await _sessionStore.read();
    if (saved == null || saved.token.isEmpty) {
      return;
    }

    _token = saved.token;
    _clientId = _extractClientId(saved.token);
    _name = _extractName(saved.token);
    _role = saved.role;
    _email = saved.email;
    _permissions = List<String>.from(saved.permissions);
    notifyListeners();
    await fetchLogs(refresh: false);
    await fetchBalance();
    unawaited(fetchTransactionHistory());
    unawaited(fetchCreditRequests());
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
          _clientId = _extractClientId(token);
          _name = _extractName(token);
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
      _clientId = _extractClientId(token);
      _name = _extractName(token);
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
      unawaited(fetchTransactionHistory());
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
    _transactions = <TransactionEntry>[];
    _incomingRequests = <CreditRequest>[];
    _outgoingRequests = <CreditRequest>[];
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

  /// Transfers [amount] to the client identified by [recipientEmail].
  /// Returns null on success (balance updated), or an error message string.
  Future<String?> transferFunds({
    required String recipientEmail,
    required double amount,
    String note = '',
  }) async {
    if (_token.isEmpty) return 'Not authenticated';
    _setBusy(true);
    _setError(null);
    try {
      final response = await _apiClient.post(
        '/api/payments/transfer',
        body: {
          'to_email': recipientEmail.trim(),
          'amount': amount,
          'note': note,
        },
        token: _token,
      );
      if (response['success'] == true) {
        // Refresh balance after successful transfer
        await fetchBalance();
        unawaited(fetchTransactionHistory(refresh: true));
        return null;
      }
      return (response['message'] ?? 'Transfer failed').toString();
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await logout();
        return 'Session expired. Please log in again.';
      }
      return _messageFromError(e);
    } finally {
      _setBusy(false);
    }
  }

  /// Fetches the client's own transaction history from the payments service.
  /// [refresh] = true replaces the list; [refresh] = false appends (not used yet).
  Future<void> fetchTransactionHistory({bool refresh = true}) async {
    if (_token.isEmpty) return;
    if (_txBusy) return;
    _txBusy = true;
    notifyListeners();
    try {
      final response = await _apiClient.get(
        '/api/payments/history',
        token: _token,
        query: {'limit': '20', 'offset': '0'},
      );
      final fetched =
          ((response['transactions'] ?? <dynamic>[]) as List<dynamic>)
              .whereType<Map<String, dynamic>>()
              .map(TransactionEntry.fromJson)
              .toList();
      _transactions = fetched;
    } catch (_) {
      // Silently fail
    } finally {
      _txBusy = false;
      notifyListeners();
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

  /// Creates a credit request (requester asks payer_email to send money).
  /// Returns null on success or an error message string.
  Future<String?> createCreditRequest({
    required String payerEmail,
    required double amount,
    String note = '',
  }) async {
    if (_token.isEmpty) return 'Not authenticated';
    try {
      final response = await _apiClient.post(
        '/api/payments/credit-request',
        body: {
          'payer_email': payerEmail.trim(),
          'amount': amount,
          'note': note,
        },
        token: _token,
      );
      if (response['success'] == true) {
        unawaited(fetchCreditRequests());
        return null;
      }
      return (response['message'] ?? 'Failed to create credit request')
          .toString();
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await logout();
        return 'Session expired. Please log in again.';
      }
      return _messageFromError(e);
    }
  }

  /// Fetches PENDING incoming (received) and outgoing (sent) credit requests.
  Future<void> fetchCreditRequests() async {
    if (_token.isEmpty) return;
    if (_requestsBusy) return;
    _requestsBusy = true;
    notifyListeners();
    try {
      final incoming = await _apiClient.get(
        '/api/payments/credit-requests',
        token: _token,
        query: {'direction': 'received', 'status': 'PENDING'},
      );
      _incomingRequests =
          ((incoming['requests'] ?? <dynamic>[]) as List<dynamic>)
              .whereType<Map<String, dynamic>>()
              .map(CreditRequest.fromJson)
              .toList();

      final outgoing = await _apiClient.get(
        '/api/payments/credit-requests',
        token: _token,
        query: {'direction': 'sent', 'status': 'PENDING'},
      );
      _outgoingRequests =
          ((outgoing['requests'] ?? <dynamic>[]) as List<dynamic>)
              .whereType<Map<String, dynamic>>()
              .map(CreditRequest.fromJson)
              .toList();
    } catch (_) {
      // Silently fail
    } finally {
      _requestsBusy = false;
      notifyListeners();
    }
  }

  /// Accept or reject a pending credit request (called by the payer).
  /// Returns null on success or an error message string.
  Future<String?> respondCreditRequest(String requestId, bool accept) async {
    if (_token.isEmpty) return 'Not authenticated';
    try {
      final response = await _apiClient.post(
        '/api/payments/credit-request/$requestId/respond',
        body: {'accept': accept},
        token: _token,
      );
      if (response['success'] == true) {
        if (accept) await fetchBalance();
        unawaited(fetchCreditRequests());
        unawaited(fetchTransactionHistory(refresh: true));
        return null;
      }
      return (response['message'] ?? 'Failed to respond').toString();
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await logout();
        return 'Session expired. Please log in again.';
      }
      return _messageFromError(e);
    }
  }

  /// Decodes the JWT payload into a map (returns empty map on failure).
  Map<String, dynamic> _decodeJwt(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return {};
      final normalized = base64Url.normalize(parts[1]);
      final decoded = utf8.decode(base64Url.decode(normalized));
      return jsonDecode(decoded) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  /// Extracts the client UUID from the JWT payload.
  String _extractClientId(String token) {
    final payload = _decodeJwt(token);
    return (payload['id'] ?? '').toString();
  }

  /// Extracts the client name from the JWT payload.
  String _extractName(String token) {
    final payload = _decodeJwt(token);
    return (payload['name'] ?? '').toString();
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
