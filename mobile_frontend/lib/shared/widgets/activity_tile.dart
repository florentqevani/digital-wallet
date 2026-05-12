import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile_frontend/core/theme/app_colors.dart';
import 'package:mobile_frontend/features/auth/auth_controller.dart';

class ActivityTile extends StatelessWidget {
  const ActivityTile({
    super.key,
    required this.entry,
    required this.formatAction,
  });

  final ActivityEntry entry;
  final String Function(String) formatAction;

  @override
  Widget build(BuildContext context) {
    final isSuccess = entry.status.toUpperCase() == 'SUCCESS';
    final dotColor = isSuccess ? AppColors.success : AppColors.danger;
    final fmtDate = DateFormat('dd MMM').format(entry.timestamp);
    final fmtTime = DateFormat('HH:mm').format(entry.timestamp);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: dotColor.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            isSuccess ? Icons.check_rounded : Icons.warning_amber_rounded,
            color: dotColor,
            size: 18,
          ),
        ),
        title: Text(
          formatAction(entry.action),
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
        ),
        subtitle: entry.message.isNotEmpty
            ? Text(
                entry.message,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
                overflow: TextOverflow.ellipsis,
              )
            : null,
        trailing: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              fmtTime,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              fmtDate,
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
