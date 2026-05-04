import 'package:flutter/material.dart';
import 'package:mobile_frontend/core/theme/app_colors.dart';
import 'package:mobile_frontend/features/auth/auth_controller.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Full-screen payment page that embeds the RaiAccept hosted payment form.
///
/// The RaiAccept form is loaded in frameless mode. When the form finishes,
/// RaiAccept redirects the WebView to [_callbackHost]. The [NavigationDelegate]
/// intercepts that navigation before it loads, confirms the payment with the
/// BFF, then pops with `true` (success) or `false` (cancel / fail).
class PaymentPage extends StatefulWidget {
  const PaymentPage({
    super.key,
    required this.controller,
    required this.paymentFormUrl,
    required this.raiOrderId,
    required this.amount,
  });

  final AuthController controller;
  final String paymentFormUrl;
  final String raiOrderId;
  final double amount;

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  late final WebViewController _webController;
  bool _pageLoading = true;
  bool _confirming = false;

  // Fake host we tell RaiAccept to redirect to — intercepted before the
  // WebView ever tries to load it.
  static const _callbackHost = 'mobile.callback';

  @override
  void initState() {
    super.initState();

    _webController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _pageLoading = true),
          onPageFinished: (_) => setState(() => _pageLoading = false),
          onNavigationRequest: _onNavigationRequest,
        ),
      )
      // Append &mode=frameless for RaiAccept's embedded / no-header mode
      ..loadRequest(Uri.parse('${widget.paymentFormUrl}&mode=frameless'));
  }

  NavigationDecision _onNavigationRequest(NavigationRequest request) {
    final uri = Uri.tryParse(request.url);
    if (uri == null || uri.host != _callbackHost) {
      return NavigationDecision.navigate;
    }

    switch (uri.path) {
      case '/success':
        _handleSuccess();
      default:
        // /cancel  or  /fail
        if (mounted) Navigator.of(context).pop(false);
    }
    return NavigationDecision.prevent;
  }

  Future<void> _handleSuccess() async {
    if (_confirming) return;
    setState(() => _confirming = true);

    final err = await widget.controller.confirmPayment(
      widget.raiOrderId,
      widget.amount,
    );

    if (!mounted) return;

    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
      );
      Navigator.of(context).pop(false);
    } else {
      Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Intercept hardware back — treat same as cancel
      canPop: !_confirming,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Secure Payment'),
          automaticallyImplyLeading: false,
          leading: _confirming
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : IconButton(
                  icon: const Icon(Icons.close),
                  tooltip: 'Cancel payment',
                  onPressed: () => Navigator.of(context).pop(false),
                ),
        ),
        body: Stack(
          children: [
            WebViewWidget(controller: _webController),
            if (_pageLoading || _confirming)
              const Center(child: CircularProgressIndicator()),
          ],
        ),
      ),
    );
  }
}
