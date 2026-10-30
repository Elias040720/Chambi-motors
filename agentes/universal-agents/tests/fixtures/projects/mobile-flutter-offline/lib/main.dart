import 'package:flutter/material.dart';

abstract interface class TaskRepository {
  Future<List<String>> load();
  Future<void> add(String title);
}

class NetworkUnavailable implements Exception {}

class TaskApp extends StatefulWidget {
  const TaskApp({super.key, required this.repository});
  final TaskRepository repository;

  @override
  State<TaskApp> createState() => _TaskAppState();
}

class _TaskAppState extends State<TaskApp> {
  final controller = TextEditingController();
  List<String> tasks = [];
  bool loading = true;
  bool saving = false;
  String? error;

  @override
  void initState() {
    super.initState();
    loadTasks();
  }

  Future<void> loadTasks() async {
    setState(() { loading = true; error = null; });
    try {
      final result = await widget.repository.load();
      if (!mounted) return;
      setState(() { tasks = result; loading = false; });
    } on NetworkUnavailable {
      if (!mounted) return;
      setState(() { loading = false; error = 'You are offline. Retry when connected.'; });
    }
  }

  Future<void> addTask() async {
    final title = controller.text.trim();
    if (title.isEmpty || saving) return;
    setState(() { saving = true; error = null; });
    try {
      await widget.repository.add(title);
      if (!mounted) return;
      controller.clear();
      await loadTasks();
    } on NetworkUnavailable {
      if (!mounted) return;
      setState(() { saving = false; error = 'Could not save while offline. Your text is still here.'; });
    } finally {
      if (mounted && saving) setState(() { saving = false; });
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: const Text('Tasks')),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                TextField(controller: controller, decoration: const InputDecoration(labelText: 'New task')),
                const SizedBox(height: 12),
                FilledButton(onPressed: saving ? null : addTask, child: Text(saving ? 'Saving…' : 'Add task')),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Semantics(liveRegion: true, child: Text(error!, key: const Key('task-error'))),
                  TextButton(onPressed: loadTasks, child: const Text('Retry')),
                ],
                const SizedBox(height: 12),
                if (loading) const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading tasks'))
                else if (tasks.isEmpty) const Text('No tasks yet', key: Key('empty-state'))
                else Expanded(child: ListView(children: [for (final task in tasks) ListTile(title: Text(task))])),
              ]),
            ),
          ),
        ),
      );
}
