import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';

class MainNavigationScreen extends StatelessWidget {
  final Widget child;
  const MainNavigationScreen({super.key, required this.child});

  static const _destinations = <({String path, String label, IconData icon, IconData selected})>[
    (path: '/home', label: 'Home', icon: Icons.home_outlined, selected: Icons.home_rounded),
    (path: '/explore', label: 'Explore', icon: Icons.explore_outlined, selected: Icons.explore_rounded),
    (path: '/wishlist', label: 'Saved', icon: Icons.favorite_border_rounded, selected: Icons.favorite_rounded),
    (path: '/dashboard', label: 'Bookings', icon: Icons.luggage_outlined, selected: Icons.luggage_rounded),
    (path: '/profile', label: 'Profile', icon: Icons.person_outline_rounded, selected: Icons.person_rounded),
  ];

  int _selectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final index = _destinations.indexWhere((item) => location.startsWith(item.path));
    return index < 0 ? 0 : index;
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selectedIndex(context);
    return Scaffold(
      body: child,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppTheme.line)),
          ),
          child: NavigationBar(
            height: 70,
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            selectedIndex: selected,
            onDestinationSelected: (index) => context.go(_destinations[index].path),
            indicatorColor: AppTheme.primary.withValues(alpha: .10),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: [
              for (final item in _destinations)
                NavigationDestination(
                  icon: Icon(item.icon, size: 22),
                  selectedIcon: Icon(item.selected, size: 22, color: AppTheme.primary),
                  label: item.label,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
