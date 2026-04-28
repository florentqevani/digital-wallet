import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class SessionData {
  SessionData({
    required this.token,
    required this.role,
    required this.email,
    this.permissions = const [],
  });

  final String token;
  final String role;
  final String email;
  final List<String> permissions;

  Map<String, dynamic> toJson() => {
    'token': token,
    'role': role,
    'email': email,
    'permissions': permissions,
  };

  static SessionData fromJson(Map<String, dynamic> json) {
    return SessionData(
      token: (json['token'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      permissions: (json['permissions'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
    );
  }
}

class SessionStore {
  static const String _key = 'session_data';

  Future<void> save(SessionData data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(data.toJson()));
  }

  Future<SessionData?> read() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);

    if (raw == null || raw.isEmpty) {
      return null;
    }

    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return SessionData.fromJson(decoded);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
