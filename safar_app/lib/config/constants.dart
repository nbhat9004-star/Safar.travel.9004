class AppConstants {
  /// Supply the deployed Safar Curated API origin at build time:
  /// flutter build apk --dart-define=SAFAR_API_BASE_URL=https://your-domain/api
  /// Never ship localhost or credentials in the mobile binary.
  static const String baseUrl = String.fromEnvironment(
    'SAFAR_API_BASE_URL',
    defaultValue: '',
  );

  static const String appName = 'Safar Curated';
  static const String companyName = 'Lafqa Ventures Pvt Ltd';

  static const String userBoxKey = 'user_box';
  static const String wishlistBoxKey = 'wishlist_box';
  static const String aiPlansBoxKey = 'ai_plans_box';
}
