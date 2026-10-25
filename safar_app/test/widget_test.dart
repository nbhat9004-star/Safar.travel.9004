import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:safar_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: SafarApp()));
    await tester.pump();

    expect(find.text('Safar'), findsOneWidget);
    expect(find.text('Discover Kashmir'), findsOneWidget);

    // The splash screen schedules navigation after two seconds. Advance the
    // fake clock so its Future.delayed completes before the test is disposed.
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
  });
}
