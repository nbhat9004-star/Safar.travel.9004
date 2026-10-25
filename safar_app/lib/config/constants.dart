class AppConstants {
  // API Configuration
  static const String baseUrl = String.fromEnvironment(
    'SAFAR_API_BASE_URL',
    defaultValue: 'https://safar-travel-9004-fn0kytt6t-muhammad-shahnawaz-s-projects1.vercel.app/api',
  );
  
  // App Branding
  static const String appName = 'Safar';
  static const String companyName = 'Lafqa Ventures Pvt Ltd';
  
  // Colors
  static const String primaryColorHex = '#10B981';
  static const String secondaryColorHex = '#0F3D2E';
  static const String accentColorHex = '#F59E0B';
  
  // Razorpay (Placeholder)
  static const String razorpayKeyId = 'YOUR_KEY_ID';
  static const String razorpaySecret = 'YOUR_SECRET';
  
  // Storage Keys
  static const String userBoxKey = 'user_box';
  static const String wishlistBoxKey = 'wishlist_box';
  static const String aiPlansBoxKey = 'ai_plans_box';
}
