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
    required this.onAddCurrencyAccount,
    this.swipeHint,
    this.successMessage,
  });

  final String name;
  final double balance;
  final String currency;
  final VoidCallback onSend;
  final VoidCallback onAddCurrencyAccount;
  final String? swipeHint;
  final String? successMessage;

  static List<Color> _gradientFor(String currency) {
    switch (currency.toUpperCase()) {
      case 'EUR':
        return [const Color(0xFF5B21B6), const Color(0xFF2D1465)];
      case 'GBP':
        return [const Color(0xFF065F46), const Color(0xFF022C22)];
      default:
        return [AppColors.primary, AppColors.primaryDark];
    }
  }

  @override
  Widget build(BuildContext context) {
    final gradColors = _gradientFor(currency);
    final fmt = NumberFormat('#,##0.00');
    final firstName = name.split(' ').first;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradColors,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: gradColors.last.withValues(alpha: 0.4),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 20, 22, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    firstName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.2,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    currency,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              'Available balance',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 11,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.3,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              fmt.format(balance),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 30,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
            if (successMessage != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(
                    Icons.check_circle_outline,
                    color: AppColors.success,
                    size: 13,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      successMessage!,
                      style: const TextStyle(
                        color: AppColors.success,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            if (swipeHint != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(
                    Icons.swipe_outlined,
                    size: 12,
                    color: Colors.white.withValues(alpha: 0.6),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      swipeHint!,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.6),
                        fontSize: 10.5,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            const Spacer(),
            Row(
              children: [
                _CardButton(
                  icon: Icons.send_rounded,
                  label: 'Send',
                  onTap: onSend,
                ),
                const SizedBox(width: 10),
                _CardButton(
                  icon: Icons.add_card_outlined,
                  label: 'Add currency',
                  onTap: onAddCurrencyAccount,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CardButton extends StatelessWidget {
  const _CardButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white, size: 14),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
