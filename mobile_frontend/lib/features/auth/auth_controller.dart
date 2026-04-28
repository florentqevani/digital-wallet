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
    // Fetch logs for restored session
    await fetchLogs(refresh: false);
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
    _permissions = <String>[];
    _recentActivity = <ActivityEntry>[];
    _logsPage = 1;
    _hasMoreLogs = true;
    _setError(null);
    await _sessionStore.clear();
    notifyListeners();
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
