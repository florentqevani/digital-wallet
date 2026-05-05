import 'package:flutter/material.dart';
import 'package:mobile_frontend/core/theme/app_colors.dart';
import 'package:mobile_frontend/features/auth/auth_controller.dart';
import 'package:mobile_frontend/features/login/login_page.dart';
import 'package:mobile_frontend/features/payment/payment_page.dart';
import 'dart:async';
import 'package:intl/intl.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.controller});

  static const String routeName = '/home';
  final AuthController controller;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ScrollController _scrollController = ScrollController();
  bool _showSpinner = false;
  Timer? _spinnerTimer;
  String? _addMoneySuccess;

  void _triggerFetch({bool refresh = false}) {
    widget.controller.fetchLogs(refresh: refresh);
    setState(() => _showSpinner = true);
    _spinnerTimer?.cancel();
    _spinnerTimer = Timer(const Duration(seconds: 1), () {
      if (mounted) setState(() => _showSpinner = false);
    });
  }

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerUpdate);
    _scrollController.addListener(_onScroll);
    if (widget.controller.recentActivity.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _triggerFetch(refresh: true),
      );
    }
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    _spinnerTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 100) {
      _triggerFetch();
    }
  }

  String _formatAction(String action) {
    switch (action.toUpperCase()) {
      case 'PAYMENT_COMPLETED':
        return 'Payment Completed';
      case 'LOGIN':
        return 'Login';
      case 'LOGOUT':
        return 'Logout';
      case 'REGISTER':
        return 'Registration';
      case 'UPDATE_PROFILE':
        return 'Profile Updated';
      default:
        return action
            .split('_')
            .map(
              (w) => w.isEmpty
                  ? ''
                  : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}',
            )
            .join(' ');
    }
  }

  void _showAddMoneyDialog() {
    final amountController = TextEditingController();
    // Dialog state is local — never touches _HomePageState fields
    var busy = false;
    String? dialogError;

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Add Money'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Current balance: ${NumberFormat('#,##0.00').format(widget.controller.balance)} ${widget.controller.currency}',
                style: Theme.of(ctx).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: amountController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Amount (ALL)',
                  hintText: '0.00',
                ),
                autofocus: true,
              ),
              if (dialogError != null) ...[
                const SizedBox(height: 8),
                Text(
                  dialogError!,
                  style: const TextStyle(color: AppColors.danger, fontSize: 13),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: busy ? null : () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: busy
                  ? null
                  : () async {
                      final raw = amountController.text.trim();
                      final amount = double.tryParse(raw);
                      if (amount == null || amount <= 0) {
                        setDialogState(
                          () => dialogError = 'Enter a valid positive amount',
                        );
                        return;
                      }
                      setDialogState(() {
                        busy = true;
                        dialogError = null;
                      });
                      // Initiate payment — returns RaiAccept form URL or null
                      final result = await widget.controller.initiatePayment(
                        amount,
                      );
                      if (!ctx.mounted) return;
                      if (result == null) {
                        // initiatePayment already set controller.error
                        setDialogState(() {
                          busy = false;
                          dialogError =
                              widget.controller.error ??
                              'Could not start payment';
                        });
                        return;
                      }
                      // Close dialog, then open payment WebView
                      Navigator.of(ctx).pop();
                      if (!mounted) return;
                      final paid = await Navigator.of(context).push<bool>(
                        MaterialPageRoute(
                          builder: (_) => PaymentPage(
                            controller: widget.controller,
                            paymentFormUrl: result['paymentFormUrl']!,
                            raiOrderId: result['raiOrderId']!,
                            amount: amount,
                          ),
                        ),
                      );
                      if (paid == true && mounted) {
                        // Refresh balance and activity log immediately
                        widget.controller.fetchBalance();
                        _triggerFetch(refresh: true);
                        setState(
                          () => _addMoneySuccess =
                              'Deposited ${NumberFormat('#,##0.00').format(amount)} ${widget.controller.currency}',
                        );
                        Future.delayed(const Duration(seconds: 3), () {
                          if (mounted) setState(() => _addMoneySuccess = null);
                        });
                      }
                    },
              child: busy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Pay with Card'),
            ),
          ],
        ),
      ),
    ).then((_) {
      // Dispose after the dialog's element tree is fully removed
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => amountController.dispose(),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mobile Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: () async {
              await controller.logout();
              if (!context.mounted) {
                return;
              }
              Navigator.of(
                context,
              ).pushNamedAndRemoveUntil(LoginPage.routeName, (_) => false);
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddMoneyDialog,
        icon: const Icon(Icons.add),
        label: const Text('Add Money'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Signed in as',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        controller.email,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(
                            Icons.verified_user,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Role: ${controller.role.isEmpty ? 'client' : controller.role}',
                          ),
                        ],
                      ),
                      const Divider(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Balance',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${NumberFormat('#,##0.00').format(controller.balance)} ${controller.currency}',
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                          IconButton.filled(
                            onPressed: _showAddMoneyDialog,
                            icon: const Icon(Icons.add),
                            tooltip: 'Add money',
                          ),
                        ],
                      ),
                      if (_addMoneySuccess != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            _addMoneySuccess!,
                            style: const TextStyle(
                              color: AppColors.success,
                              fontSize: 13,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Activity Log',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (_showSpinner)
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async => _triggerFetch(refresh: true),
                  child: controller.recentActivity.isEmpty && !_showSpinner
                      ? const SingleChildScrollView(
                          physics: AlwaysScrollableScrollPhysics(),
                          child: Card(
                            child: Center(
                              child: Padding(
                                padding: EdgeInsets.all(24),
                                child: Text(
                                  'No activity yet. Pull to refresh.',
                                ),
                              ),
                            ),
                          ),
                        )
                      : ListView.separated(
                          controller: _scrollController,
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount:
                              controller.recentActivity.length +
                              (_showSpinner && controller.hasMoreLogs ? 1 : 0),
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            if (index == controller.recentActivity.length) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 16),
                                child: Center(
                                  child: CircularProgressIndicator(),
                                ),
                              );
                            }
                            final item = controller.recentActivity[index];
                            final isSuccess =
                                item.status.toUpperCase() == 'SUCCESS';
                            return Card(
                              child: ListTile(
                                leading: Icon(
                                  isSuccess ? Icons.check_circle : Icons.error,
                                  color: isSuccess
                                      ? AppColors.success
                                      : AppColors.danger,
                                ),
                                title: Text(_formatAction(item.action)),
                                subtitle: Text(
                                  item.message.isEmpty
                                      ? item.actorId
                                      : item.message,
                                ),
                                trailing: Text(
                                  '${item.timestamp.hour.toString().padLeft(2, '0')}:${item.timestamp.minute.toString().padLeft(2, '0')}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
