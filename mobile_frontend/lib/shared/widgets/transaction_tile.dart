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
    final accentColor = isCredit ? AppColors.success : AppColors.primary;
    final icon = isTopUp
        ? Icons.arrow_downward_rounded
        : (isCredit
              ? Icons.arrow_downward_rounded
              : Icons.arrow_upward_rounded);

    String counterpartyLine;
    if (isTopUp) {
      counterpartyLine = 'Admin top-up';
    } else if (isCredit) {
      final from = tx.fromEmail.isNotEmpty ? tx.fromEmail : tx.fromClientId;
      counterpartyLine = 'From $from';
    } else {
      final to = tx.toEmail.isNotEmpty ? tx.toEmail : tx.toClientId;
      counterpartyLine = 'To $to';
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Accent bar
            Container(width: 4, color: accentColor),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                child: Row(
                  children: [
                    // Icon circle
                    Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: accentColor.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(icon, color: accentColor, size: 16),
                    ),
                    const SizedBox(width: 12),
                    // Labels
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            isTopUp
                                ? 'Top-Up'
                                : (isCredit ? 'Received' : 'Sent'),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                          if (counterpartyLine.isNotEmpty)
                            Text(
                              counterpartyLine,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textMuted,
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          if (tx.note.isNotEmpty)
                            Text(
                              tx.note,
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: AppColors.textMuted,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Amount + date
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$sign${NumberFormat('#,##0.00').format(tx.amount)}',
                          style: TextStyle(
                            color: amountColor,
                            fontWeight: FontWeight.w800,
                            fontSize: 14.5,
                          ),
                        ),
                        Text(
                          tx.currency,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat('dd MMM, HH:mm').format(tx.createdAt),
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
