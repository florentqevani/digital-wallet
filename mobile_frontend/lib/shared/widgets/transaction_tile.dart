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

    // Determine subtitle lines
    String? counterpartyLine;
    if (isTopUp) {
      counterpartyLine = null; // admin top-up, no counterparty
    } else if (isCredit) {
      final from = tx.fromEmail.isNotEmpty ? tx.fromEmail : tx.fromClientId;
      counterpartyLine = 'Received from $from';
    } else {
      final to = tx.toEmail.isNotEmpty ? tx.toEmail : tx.toClientId;
      counterpartyLine = 'Sent to $to';
    }

    final hasNote = tx.note.isNotEmpty;
    final isThreeLine = counterpartyLine != null && hasNote;

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconColor.withAlpha(30),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(
          isTopUp ? 'Top-Up' : (isCredit ? 'Received' : 'Sent'),
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (counterpartyLine != null)
              Text(
                counterpartyLine,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            if (hasNote)
              Text(
                tx.note,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                overflow: TextOverflow.ellipsis,
              ),
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
        isThreeLine: isThreeLine,
      ),
    );
  }
}
