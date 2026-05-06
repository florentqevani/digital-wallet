import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile_frontend/core/theme/app_colors.dart';

class BalanceCard extends StatelessWidget {
  const BalanceCard({
    super.key,
    required this.name,
    required this.balance,
    required this.currency,
    required this.onSend,
    this.successMessage,
  });

  final String name;
  final double balance;
  final String currency;
  final VoidCallback onSend;
  final String? successMessage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Signed in as', style: theme.textTheme.bodySmall),
            const SizedBox(height: 4),
            Text(name, style: theme.textTheme.titleMedium),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Balance', style: theme.textTheme.bodySmall),
                    const SizedBox(height: 2),
                    Text(
                      '${NumberFormat('#,##0.00').format(balance)} $currency',
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                IconButton.outlined(
                  onPressed: onSend,
                  icon: const Icon(Icons.send),
                  tooltip: 'Send money',
                ),
              ],
            ),
            if (successMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  successMessage!,
                  style: const TextStyle(
                    color: AppColors.success,
                    fontSize: 13,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
