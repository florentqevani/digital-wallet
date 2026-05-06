import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile_frontend/core/theme/app_colors.dart';
import 'package:mobile_frontend/features/auth/auth_controller.dart';

class TransactionTile extends StatelessWidget {
  const TransactionTile({super.key, required this.tx, required this.isCredit});

  final TransactionEntry tx;
  final bool isCredit;

  @override
  Widget build(BuildContext context) {
    final isTopUp = tx.type == 'TOPUP';
    final sign = isCredit ? '+' : '-';
    final amountColor = isCredit ? AppColors.success : AppColors.danger;
    final icon = isCredit ? Icons.arrow_downward : Icons.arrow_upward;
    final iconColor = isCredit ? AppColors.success : AppColors.primary;
    final title = isTopUp ? 'Top-Up' : (isCredit ? 'Received' : 'Sent');

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconColor.withAlpha(30),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (tx.note.isNotEmpty)
              Text(tx.note, style: const TextStyle(fontSize: 12)),
            Text(
              DateFormat('dd MMM, HH:mm').format(tx.createdAt),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        trailing: Text(
          '$sign${NumberFormat('#,##0.00').format(tx.amount)} ${tx.currency}',
          style: TextStyle(
            color: amountColor,
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
        isThreeLine: tx.note.isNotEmpty,
      ),
    );
  }
}
