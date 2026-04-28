import 'package:flutter/material.dart';
import 'package:mobile_frontend/core/theme/app_theme.dart';
import 'package:mobile_frontend/features/auth/auth_controller.dart';
import 'package:mobile_frontend/features/login/login_page.dart';
import 'package:mobile_frontend/features/register/register_page.dart';
import 'package:mobile_frontend/features/home/home_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MobileFrontendApp());
}

class MobileFrontendApp extends StatefulWidget {
  const MobileFrontendApp({super.key});

  @override
  State<MobileFrontendApp> createState() => _MobileFrontendAppState();
}

class _MobileFrontendAppState extends State<MobileFrontendApp> {
  final AuthController _authController = AuthController();
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    await _authController.loadSession();
    if (!mounted) {
      return;
    }
    setState(() {
      _initialized = true;
    });
  }

  @override
  void dispose() {
    _authController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _authController,
      builder: (context, _) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'GRPC Mobile Frontend',
          theme: AppTheme.light,
          routes: {
            LoginPage.routeName: (context) =>
                LoginPage(controller: _authController),
            RegisterPage.routeName: (context) =>
                RegisterPage(controller: _authController),
            HomePage.routeName: (context) =>
                HomePage(controller: _authController),
          },
          home: !_initialized
              ? const _SplashScreen()
              : (_authController.isAuthenticated
                    ? HomePage(controller: _authController)
                    : LoginPage(controller: _authController)),
        );
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
