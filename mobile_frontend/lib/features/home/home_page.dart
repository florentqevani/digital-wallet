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
  String? _requestSuccess;

  AuthController get controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    controller.addListener(_onControllerUpdate);
    _scrollController.addListener(_onScroll);
    if (controller.recentActivity.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _triggerFetch(refresh: true),
      );
    }
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => controller.fetchCreditRequests(),
    );
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

  Future<void> _refreshAll() async {
    await Future.wait([
      controller.fetchBalance(),
      Future(() => _triggerFetch(refresh: true)),
      controller.fetchTransactionHistory(refresh: true),
      controller.fetchCreditRequests(),
    ]);
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

  void _showRequestMoneyDialog() {
    final payerEmailCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final noteCtrl = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => _RequestMoneyDialog(
        payerEmailCtrl: payerEmailCtrl,
        amountCtrl: amountCtrl,
        noteCtrl: noteCtrl,
        onSubmit: (payerEmail, amount, note) async {
          final err = await controller.createCreditRequest(
            payerEmail: payerEmail,
            amount: amount,
            note: note,
          );
          if (!ctx.mounted) return err;
          if (err == null) {
            Navigator.of(ctx).pop();
            if (mounted) {
              setState(() {
                _requestSuccess =
                    'Request of ${NumberFormat('#,##0.00').format(amount)} ALL sent to $payerEmail';
              });
              Future.delayed(const Duration(seconds: 4), () {
                if (mounted) setState(() => _requestSuccess = null);
              });
            }
          }
          return err;
        },
      ),
    ).then((_) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        payerEmailCtrl.dispose();
        amountCtrl.dispose();
        noteCtrl.dispose();
      });
    });
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
        child: RefreshIndicator(
          onRefresh: _refreshAll,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: SizedBox(
              height:
                  MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.top -
                  kToolbarHeight,
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
                        Tab(text: 'Requests'),
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
                          _RequestsTab(
                            controller: controller,
                            successMessage: _requestSuccess,
                            onRequestMoney: _showRequestMoneyDialog,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
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

// ── Requests tab ──────────────────────────────────────────────────────────────

class _RequestsTab extends StatelessWidget {
  const _RequestsTab({
    required this.controller,
    required this.onRequestMoney,
    this.successMessage,
  });

  final AuthController controller;
  final VoidCallback onRequestMoney;
  final String? successMessage;

  @override
  Widget build(BuildContext context) {
    if (controller.isRequestsBusy) {
      return const Center(child: CircularProgressIndicator());
    }

    final incoming = controller.incomingRequests;
    final outgoing = controller.outgoingRequests;

    return RefreshIndicator(
      onRefresh: controller.fetchCreditRequests,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 80),
        children: [
          if (successMessage != null)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.success),
              ),
              child: Text(
                successMessage!,
                style: const TextStyle(color: AppColors.success, fontSize: 13),
              ),
            ),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: onRequestMoney,
              icon: const Icon(Icons.request_page_outlined, size: 16),
              label: const Text('Request Money'),
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            ),
          ),
          const SizedBox(height: 12),

          // ── Incoming ──────────────────────────────────────────────────────
          Text(
            'Incoming Requests',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          if (incoming.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'No pending incoming requests.',
                style: TextStyle(color: Colors.grey),
              ),
            )
          else
            ...incoming.map(
              (req) => _RequestTile(
                request: req,
                isIncoming: true,
                onAccept: () => _respond(context, req.id, true),
                onReject: () => _respond(context, req.id, false),
              ),
            ),

          const SizedBox(height: 16),

          // ── Outgoing ──────────────────────────────────────────────────────
          Text(
            'Outgoing Requests',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          if (outgoing.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'No pending outgoing requests.',
                style: TextStyle(color: Colors.grey),
              ),
            )
          else
            ...outgoing.map(
              (req) => _RequestTile(request: req, isIncoming: false),
            ),
        ],
      ),
    );
  }

  Future<void> _respond(BuildContext context, String id, bool accept) async {
    final err = await controller.respondCreditRequest(id, accept);
    if (!context.mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
      );
    } else {
      final label = accept ? 'accepted' : 'rejected';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Request $label')));
    }
  }
}

// ── Request tile ──────────────────────────────────────────────────────────────

class _RequestTile extends StatefulWidget {
  const _RequestTile({
    required this.request,
    required this.isIncoming,
    this.onAccept,
    this.onReject,
  });

  final CreditRequest request;
  final bool isIncoming;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;

  @override
  State<_RequestTile> createState() => _RequestTileState();
}

class _RequestTileState extends State<_RequestTile> {
  bool _busy = false;

  Future<void> _handle(VoidCallback cb) async {
    setState(() => _busy = true);
    cb();
    // The controller will notifyListeners and rebuild, no need to reset
  }

  @override
  Widget build(BuildContext context) {
    final req = widget.request;
    final fmt = NumberFormat('#,##0.00');

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.request_page_outlined,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.isIncoming
                        ? 'From: ${req.requesterEmail}'
                        : 'To: ${req.payerEmail}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  '${fmt.format(req.amount)} ${req.currency}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            if (req.note.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                req.note,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
            if (widget.isIncoming) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _busy ? null : () => _handle(widget.onReject!),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.danger,
                    ),
                    child: const Text('Reject'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _busy ? null : () => _handle(widget.onAccept!),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.success,
                    ),
                    child: _busy
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Accept'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Request money dialog ──────────────────────────────────────────────────────

class _RequestMoneyDialog extends StatefulWidget {
  const _RequestMoneyDialog({
    required this.payerEmailCtrl,
    required this.amountCtrl,
    required this.noteCtrl,
    required this.onSubmit,
  });

  final TextEditingController payerEmailCtrl;
  final TextEditingController amountCtrl;
  final TextEditingController noteCtrl;
  final Future<String?> Function(String email, double amount, String note)
  onSubmit;

  @override
  State<_RequestMoneyDialog> createState() => _RequestMoneyDialogState();
}

class _RequestMoneyDialogState extends State<_RequestMoneyDialog> {
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    final payerEmail = widget.payerEmailCtrl.text.trim();
    final amount = double.tryParse(widget.amountCtrl.text.trim());
    final note = widget.noteCtrl.text.trim();

    if (payerEmail.isEmpty || !payerEmail.contains('@')) {
      setState(() => _error = 'Enter a valid payer email');
      return;
    }
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid positive amount');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    final err = await widget.onSubmit(payerEmail, amount, note);
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
      title: const Text('Request Money'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Ask someone to send you money.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: widget.payerEmailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Payer email',
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
              : const Icon(Icons.request_page_outlined, size: 16),
          label: const Text('Request'),
          onPressed: _busy ? null : _submit,
        ),
      ],
    );
  }
}
