import 'package:flutter/material.dart';
import 'package:mobile_frontend/core/theme/app_colors.dart';
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
  // Track only auth status so MaterialApp is NOT rebuilt on every notifyListeners()
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _authController.addListener(_onAuthChanged);
    _restoreSession();
  }

  void _onAuthChanged() {
    final newAuth = _authController.isAuthenticated;
    if (newAuth != _isAuthenticated && mounted) {
      setState(() => _isAuthenticated = newAuth);
    }
  }

  Future<void> _restoreSession() async {
    await _authController.loadSession();
    if (!mounted) {
      return;
    }
    setState(() {
      _initialized = true;
      _isAuthenticated = _authController.isAuthenticated;
    });
  }

  @override
  void dispose() {
    _authController.removeListener(_onAuthChanged);
    _authController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'GRPC Mobile Frontend',
      theme: AppTheme.light,
      routes: {
        LoginPage.routeName: (context) =>
            LoginPage(controller: _authController),
        RegisterPage.routeName: (context) =>
            RegisterPage(controller: _authController),
        HomePage.routeName: (context) => HomePage(controller: _authController),
      },
      home: !_initialized
          ? const _SplashScreen()
          : (_isAuthenticated
                ? HomePage(controller: _authController)
                : LoginPage(controller: _authController)),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.primary, AppColors.primaryDark],
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.account_balance_wallet_rounded,
                color: Colors.white,
                size: 56,
              ),
              SizedBox(height: 20),
              Text(
                'WalletApp',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              SizedBox(height: 36),
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
