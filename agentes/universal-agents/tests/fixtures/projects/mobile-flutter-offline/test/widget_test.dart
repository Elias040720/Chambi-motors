import 'package:flutter_test/flutter_test.dart';
import 'package:ua_mobile_offline_fixture/main.dart';

class FakeTasks implements TaskRepository {
  List<String> tasks = [];
  bool offline = false;

  @override
  Future<List<String>> load() async {
    if (offline) throw NetworkUnavailable();
    return List<String>.of(tasks);
  }

  @override
  Future<void> add(String title) async {
    if (offline) throw NetworkUnavailable();
    tasks.add(title);
  }
}

void main() {
  testWidgets('empty state and task creation are accessible and functional', (tester) async {
    final repository = FakeTasks();
    await tester.pumpWidget(TaskApp(repository: repository));
    await tester.pumpAndSettle();
    expect(find.text('No tasks yet'), findsOneWidget);
    await tester.enterText(find.byType(EditableText), 'Buy milk');
    await tester.tap(find.text('Add task'));
    await tester.pumpAndSettle();
    expect(find.text('Buy milk'), findsOneWidget);
    expect(repository.tasks, ['Buy milk']);
  });

  testWidgets('offline error offers retry and preserves unsaved task text', (tester) async {
    final repository = FakeTasks()..offline = true;
    await tester.pumpWidget(TaskApp(repository: repository));
    await tester.pumpAndSettle();
    expect(find.text('You are offline. Retry when connected.'), findsOneWidget);
    repository.offline = false;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(find.text('No tasks yet'), findsOneWidget);
    await tester.enterText(find.byType(EditableText), 'Draft task');
    repository.offline = true;
    await tester.tap(find.text('Add task'));
    await tester.pumpAndSettle();
    expect(find.text('Could not save while offline. Your text is still here.'), findsOneWidget);
    expect(find.text('Draft task'), findsOneWidget);
  });
}
