import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile_frontend/core/theme/app_colors.dart';
import 'package:mobile_frontend/features/auth/auth_controller.dart';
import 'package:url_launcher/url_launcher.dart';
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
  WebViewController? _webController;
  bool _pageLoading = true;
  bool _confirming = false;
  // Web-only: tracks whether the payment tab has been opened
  bool _webTabOpened = false;

  // Only Android and iOS have a webview_flutter implementation.
  static bool get _webViewSupported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  // Fake host we tell RaiAccept to redirect to — intercepted before the
  // WebView ever tries to load it.
  static const _callbackHost = 'mobile.callback';

  @override
  void initState() {
    super.initState();

    if (!_webViewSupported) return;

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

  Future<void> _openWebPayment() async {
    final uri = Uri.parse('${widget.paymentFormUrl}&mode=frameless');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open payment page.')),
        );
      }
      return;
    }
    setState(() => _webTabOpened = true);
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
            if (_webViewSupported && _webController != null)
              WebViewWidget(controller: _webController!)
            else
              _WebPaymentPrompt(
                paymentFormUrl: widget.paymentFormUrl,
                tabOpened: _webTabOpened,
                confirming: _confirming,
                onOpen: _openWebPayment,
                onConfirm: _handleSuccess,
                onCancel: () => Navigator.of(context).pop(false),
              ),
            if (_webViewSupported && (_pageLoading || _confirming))
              const Center(child: CircularProgressIndicator()),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Web-platform payment prompt
// ---------------------------------------------------------------------------

class _WebPaymentPrompt extends StatelessWidget {
  const _WebPaymentPrompt({
    required this.paymentFormUrl,
    required this.tabOpened,
    required this.confirming,
    required this.onOpen,
    required this.onConfirm,
    required this.onCancel,
  });

  final String paymentFormUrl;
  final bool tabOpened;
  final bool confirming;
  final VoidCallback onOpen;
  final VoidCallback onConfirm;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.open_in_new, size: 48, color: Colors.blueGrey),
              const SizedBox(height: 20),
              Text(
                tabOpened
                    ? 'Complete your payment in the tab that opened, then come back here.'
                    : 'You will be redirected to the secure RaiAccept payment page in a new tab.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 32),
              if (!tabOpened)
                FilledButton.icon(
                  onPressed: onOpen,
                  icon: const Icon(Icons.payment),
                  label: const Text('Open Payment Page'),
                ),
              if (tabOpened) ...[
                FilledButton.icon(
                  onPressed: confirming ? null : onConfirm,
                  icon: confirming
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: const Text('I completed the payment'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: confirming ? null : onCancel,
                  icon: const Icon(Icons.close),
                  label: const Text('Cancel'),
                ),
                const SizedBox(height: 20),
                TextButton.icon(
                  onPressed: onOpen,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Reopen payment page'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
