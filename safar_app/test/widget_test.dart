import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:safar_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // main() normally supplies this scope; the test mounts SafarApp directly.
    await tester.pumpWidget(const ProviderScope(child: SafarApp()));
    expect(find.text('Safar'), findsOneWidget);

    // Let the splash screen finish its delayed auth lookup and route change.
    await tester.pump(const Duration(seconds: 2));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
  });
}
