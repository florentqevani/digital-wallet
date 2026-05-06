import 'package:flutter/material.dart';
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
    return Card(
      child: ListTile(
        leading: Icon(
          isSuccess ? Icons.check_circle : Icons.error,
          color: isSuccess ? AppColors.success : AppColors.danger,
        ),
        title: Text(formatAction(entry.action)),
        subtitle: Text(entry.message.isEmpty ? entry.actorId : entry.message),
        trailing: Text(
          '${entry.timestamp.hour.toString().padLeft(2, '0')}:'
          '${entry.timestamp.minute.toString().padLeft(2, '0')}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ),
    );
  }
}
