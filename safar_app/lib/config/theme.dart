import 'package:flutter/material.dart';

/// Safar Curated's approved premium, light-first design system.
/// Keep these tokens centralized so every Traveler, Host and shared screen
/// uses the same visual language.
class AppTheme {
  static const Color primary = Color(0xFF0F766E);
  static const Color teal = Color(0xFF14B8A6);
  static const Color accent = Color(0xFFF59E0B);
  static const Color canvas = Color(0xFFF8FAFC);
  static const Color ink = Color(0xFF0F172A);
  static const Color muted = Color(0xFF64748B);
  static const Color line = Color(0xFFE2E8F0);
  static const Color success = Color(0xFF15803D);
  static const Color error = Color(0xFFDC2626);

  static Color get primaryColor => primary;
  static Color get secondaryColor => ink;
  static Color get accentColor => accent;
  static Color get backgroundColor => Colors.white;
  static Color get surfaceColor => canvas;
  static Color get errorColor => error;

  static ThemeData get lightTheme {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      primary: primary,
      secondary: teal,
      tertiary: accent,
      surface: Colors.white,
      error: error,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        backgroundColor: canvas,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: ink, fontSize: 21, fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(color: ink, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: -1.0),
        headlineMedium: TextStyle(color: ink, fontSize: 26, fontWeight: FontWeight.w750, letterSpacing: -0.6),
        titleLarge: TextStyle(color: ink, fontSize: 20, fontWeight: FontWeight.w700),
        titleMedium: TextStyle(color: ink, fontSize: 16, fontWeight: FontWeight.w650),
        bodyLarge: TextStyle(color: ink, fontSize: 15, height: 1.45),
        bodyMedium: TextStyle(color: muted, fontSize: 14, height: 1.4),
        labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: canvas, foregroundColor: ink, elevation: 0,
        scrolledUnderElevation: 0, centerTitle: false,
        titleTextStyle: TextStyle(color: ink, fontSize: 21, fontWeight: FontWeight.w700),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary, foregroundColor: Colors.white,
          minimumSize: const Size(48, 52),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary, minimumSize: const Size(48, 50),
          side: const BorderSide(color: line),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: Colors.white,
        hintStyle: const TextStyle(color: muted),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: line)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: primary, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      cardTheme: CardThemeData(
        color: Colors.white, elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: const BorderSide(color: line),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white, selectedColor: primary.withValues(alpha: .10),
        side: const BorderSide(color: line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        labelStyle: const TextStyle(color: ink, fontWeight: FontWeight.w600),
      ),
      dividerColor: line,
    );
  }
}
