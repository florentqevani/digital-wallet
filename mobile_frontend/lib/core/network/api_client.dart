import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile_frontend/core/config/app_config.dart';

class ApiException implements Exception {
  ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path');
    final response = await http.post(
      uri,
      headers: _headers(token),
      body: jsonEncode(body ?? <String, dynamic>{}),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> get(
    String path, {
    String? token,
    Map<String, String>? query,
  }) async {
    final baseUri = Uri.parse('${AppConfig.apiBaseUrl}$path');
    final uri = baseUri.replace(queryParameters: query);

    final response = await http.get(uri, headers: _headers(token));
    return _decode(response);
  }

  Map<String, String> _headers(String? token) {
    return <String, String>{
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Map<String, dynamic> _decode(http.Response response) {
    final isJson =
        response.headers['content-type']?.contains('application/json') ?? false;
    final parsed = isJson && response.body.isNotEmpty
        ? jsonDecode(response.body) as Map<String, dynamic>
        : <String, dynamic>{};

    if (response.statusCode >= 400) {
      throw ApiException(
        (parsed['message'] ?? parsed['error'] ?? 'Request failed').toString(),
      );
    }

    return parsed;
  }
}
