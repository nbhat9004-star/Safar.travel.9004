import 'package:flutter_test/flutter_test.dart';
import 'package:safar_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SafarApp());
    expect(find.text('Safar'), findsOneWidget);

    // The splash screen intentionally waits two seconds before routing.
    // Advance the fake clock so its delayed navigation completes before teardown.
    await tester.pump(const Duration(seconds: 2));
    await tester.pump();
  });
}
