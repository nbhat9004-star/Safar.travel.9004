import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import '../config/constants.dart';

class ApiService {
  late final Dio _dio;
  final CookieJar _cookieJar = CookieJar();

  ApiService() {
    if (AppConstants.baseUrl.isEmpty) {
      throw StateError(
        'Safar API is not configured. Build with --dart-define=SAFAR_API_BASE_URL=https://your-domain/api',
      );
    }
    final uri = Uri.tryParse(AppConstants.baseUrl);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty ||
        (uri.scheme != 'https' && uri.host != 'localhost' && uri.host != '10.0.2.2')) {
      throw StateError('SAFAR_API_BASE_URL must be a valid HTTPS API URL.');
    }
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 45),
      sendTimeout: const Duration(seconds: 20),
      headers: const {'Content-Type': 'application/json', 'Accept': 'application/json'},
    ));
    _dio.interceptors.add(CookieManager(_cookieJar));
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {'email': email, 'password': password});
    return Map<String, dynamic>.from(response.data);
  }

  Future<Map<String, dynamic>> register(String name, String email, String password) async {
    final response = await _dio.post('/auth/register', data: {'name': name, 'email': email, 'password': password});
    return Map<String, dynamic>.from(response.data);
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return Map<String, dynamic>.from(response.data);
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } finally {
      await _cookieJar.deleteAll();
    }
  }

  Future<List<dynamic>> getListings({
    String? category, String? location, double? minPrice, double? maxPrice,
  }) async {
    final response = await _dio.get('/listings', queryParameters: {
      if (category != null) 'category': category,
      if (location != null) 'location': location,
      if (minPrice != null) 'minPrice': minPrice,
      if (maxPrice != null) 'maxPrice': maxPrice,
    });
    return response.data['listings'] ?? [];
  }

  Future<Map<String, dynamic>> getListingById(String id) async {
    final response = await _dio.get('/listings/$id');
    return Map<String, dynamic>.from(response.data['listing']);
  }

  Future<List<dynamic>> searchListings(String query) async {
    final response = await _dio.get('/listings/search', queryParameters: {'q': query});
    return response.data['listings'] ?? [];
  }

  Future<List<dynamic>> getMyBookings() async {
    final response = await _dio.get('/bookings');
    return response.data['bookings'] ?? [];
  }

  Future<Map<String, dynamic>> createBooking({
    required String listingId, required String checkIn,
    required String checkOut, required int guests,
  }) async {
    final response = await _dio.post('/bookings', data: {
      'listingId': listingId, 'checkIn': checkIn,
      'checkOut': checkOut, 'guests': guests,
    });
    return Map<String, dynamic>.from(response.data);
  }

  Future<Map<String, dynamic>> cancelBooking(String id) async {
    final response = await _dio.patch('/bookings/$id', data: {'status': 'cancelled'});
    return Map<String, dynamic>.from(response.data);
  }

  /// Uses the deployed Safar AI endpoint. No locally fabricated itinerary is returned.
  Future<Map<String, dynamic>> generateTripPlan({
    required String destination, required int days, required String interests,
  }) async {
    final prompt = 'Create a practical $days-day travel itinerary for $destination. '
        'Interests: $interests. Organize it by day with morning, afternoon and evening '
        'activities, include realistic travel notes and approximate costs in INR. '
        'Clearly label estimates and avoid claiming live availability.';
    final response = await _dio.post('/ai-chat', data: {
      'message': prompt,
      'conversationHistory': <Map<String, String>>[],
    });
    final data = Map<String, dynamic>.from(response.data);
    final reply = data['reply'];
    if (data['success'] != true || reply is! String || reply.trim().isEmpty) {
      throw StateError(data['error']?.toString() ?? 'Safar AI did not return a trip plan.');
    }
    return {
      'plan': {
        'destination': destination,
        'days': days,
        'interests': interests,
        'summary': reply.trim(),
      },
    };
  }
}
