import 'package:flutter/material.dart';
import 'package:mobile_frontend/core/theme/app_colors.dart';
import 'package:mobile_frontend/features/auth/auth_controller.dart';
import 'package:mobile_frontend/features/login/login_page.dart';
import 'package:mobile_frontend/shared/widgets/activity_tile.dart';
import 'package:mobile_frontend/shared/widgets/balance_card.dart';
import 'package:mobile_frontend/shared/widgets/empty_state.dart';
import 'package:mobile_frontend/shared/widgets/transaction_tile.dart';
import 'dart:async';
import 'package:intl/intl.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.controller});

  static const String routeName = '/home';
  final AuthController controller;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage>
    with SingleTickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  late final TabController _tabController;
  bool _showSpinner = false;
  Timer? _spinnerTimer;
  String? _transferSuccess;

  AuthController get controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    controller.addListener(_onControllerUpdate);
    _scrollController.addListener(_onScroll);
    if (controller.recentActivity.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _triggerFetch(refresh: true),
      );
    }
  }

  @override
  void dispose() {
    controller.removeListener(_onControllerUpdate);
    _tabController.dispose();
    _spinnerTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 100) {
      _triggerFetch();
    }
  }

  void _triggerFetch({bool refresh = false}) {
    controller.fetchLogs(refresh: refresh);
    setState(() => _showSpinner = true);
    _spinnerTimer?.cancel();
    _spinnerTimer = Timer(const Duration(seconds: 1), () {
      if (mounted) setState(() => _showSpinner = false);
    });
  }

  Future<void> _signOut() async {
    await controller.logout();
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushNamedAndRemoveUntil(LoginPage.routeName, (_) => false);
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

  void _showSendMoneyDialog() {
    final emailCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final noteCtrl = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => _SendMoneyDialog(
        balance: controller.balance,
        currency: controller.currency,
        emailCtrl: emailCtrl,
        amountCtrl: amountCtrl,
        noteCtrl: noteCtrl,
        onSubmit: (toEmail, amount, note) async {
          final err = await controller.transferFunds(
            recipientEmail: toEmail,
            amount: amount,
            note: note,
          );
          if (!ctx.mounted) return err;
          if (err == null) {
            Navigator.of(ctx).pop();
            if (mounted) {
              setState(() {
                _transferSuccess =
                    'Sent ${NumberFormat('#,##0.00').format(amount)} ALL to $toEmail';
              });
              Future.delayed(const Duration(seconds: 4), () {
                if (mounted) setState(() => _transferSuccess = null);
              });
            }
          }
          return err;
        },
      ),
    ).then((_) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        emailCtrl.dispose();
        amountCtrl.dispose();
        noteCtrl.dispose();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mobile Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: _signOut,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showSendMoneyDialog,
        icon: const Icon(Icons.send),
        label: const Text('Send Money'),
        backgroundColor: AppColors.primary,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              BalanceCard(
                name: controller.name,
                balance: controller.balance,
                currency: controller.currency,
                onSend: _showSendMoneyDialog,
                successMessage: _transferSuccess,
              ),
              const SizedBox(height: 14),
              TabBar(
                controller: _tabController,
                tabs: const [
                  Tab(text: 'Activity'),
                  Tab(text: 'Transactions'),
                ],
              ),
              const SizedBox(height: 8),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _ActivityTab(
                      controller: controller,
                      scrollController: _scrollController,
                      showSpinner: _showSpinner,
                      onRefresh: () async => _triggerFetch(refresh: true),
                      formatAction: _formatAction,
                    ),
                    _TransactionsTab(controller: controller),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Activity tab ─────────────────────────────────────────────────────────────

class _ActivityTab extends StatelessWidget {
  const _ActivityTab({
    required this.controller,
    required this.scrollController,
    required this.showSpinner,
    required this.onRefresh,
    required this.formatAction,
  });

  final AuthController controller;
  final ScrollController scrollController;
  final bool showSpinner;
  final Future<void> Function() onRefresh;
  final String Function(String) formatAction;

  @override
  Widget build(BuildContext context) {
    final items = controller.recentActivity;

    if (items.isEmpty && !showSpinner) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: const EmptyState(message: 'No activity yet. Pull to refresh.'),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        controller: scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount:
            items.length + (showSpinner && controller.hasMoreLogs ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          if (index == items.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          return ActivityTile(entry: items[index], formatAction: formatAction);
        },
      ),
    );
  }
}

// ── Transactions tab ──────────────────────────────────────────────────────────

class _TransactionsTab extends StatelessWidget {
  const _TransactionsTab({required this.controller});

  final AuthController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.isTxBusy) {
      return const Center(child: CircularProgressIndicator());
    }

    final txList = controller.transactions;

    if (txList.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => controller.fetchTransactionHistory(refresh: true),
        child: const EmptyState(
          message: 'No transactions yet. Pull to refresh.',
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => controller.fetchTransactionHistory(refresh: true),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: txList.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final tx = txList[index];
          final isCredit =
              tx.type == 'TOPUP' || tx.toClientId == controller.clientId;
          return TransactionTile(tx: tx, isCredit: isCredit);
        },
      ),
    );
  }
}

// ── Send money dialog ─────────────────────────────────────────────────────────

class _SendMoneyDialog extends StatefulWidget {
  const _SendMoneyDialog({
    required this.balance,
    required this.currency,
    required this.emailCtrl,
    required this.amountCtrl,
    required this.noteCtrl,
    required this.onSubmit,
  });

  final double balance;
  final String currency;
  final TextEditingController emailCtrl;
  final TextEditingController amountCtrl;
  final TextEditingController noteCtrl;
  final Future<String?> Function(String email, double amount, String note)
  onSubmit;

  @override
  State<_SendMoneyDialog> createState() => _SendMoneyDialogState();
}

class _SendMoneyDialogState extends State<_SendMoneyDialog> {
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    final toEmail = widget.emailCtrl.text.trim();
    final amount = double.tryParse(widget.amountCtrl.text.trim());
    final note = widget.noteCtrl.text.trim();

    if (toEmail.isEmpty || !toEmail.contains('@')) {
      setState(() => _error = 'Enter a valid recipient email');
      return;
    }
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid positive amount');
      return;
    }
    if (amount > widget.balance) {
      setState(() => _error = 'Insufficient balance');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    final err = await widget.onSubmit(toEmail, amount, note);
    if (mounted && err != null) {
      setState(() {
        _busy = false;
        _error = err;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Send Money'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Available: ${NumberFormat('#,##0.00').format(widget.balance)} ${widget.currency}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: widget.emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Recipient email',
                hintText: 'someone@example.com',
                prefixIcon: Icon(Icons.person_outline),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: widget.amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Amount (ALL)',
                hintText: '0.00',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: widget.noteCtrl,
              decoration: const InputDecoration(
                labelText: 'Note (optional)',
                hintText: 'e.g. rent, coffee…',
                prefixIcon: Icon(Icons.note_outlined),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: const TextStyle(color: AppColors.danger, fontSize: 13),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton.icon(
          icon: _busy
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.send, size: 16),
          label: const Text('Send'),
          onPressed: _busy ? null : _submit,
        ),
      ],
    );
  }
}
