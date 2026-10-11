import { useState } from 'preact/hooks';
import {
  GraduationCap,
  CheckCircle2,
  Play,
  ArrowRight,
  FileCode,
  PlusCircle,
  X,
  AlertTriangle,
} from 'lucide-preact';
import type { TaskPanelProps } from './types';
import type { LearningTask } from '../../types/learningTasks';

export function TaskPanel({
  tasks,
  activeTaskId,
  files,
  width,
  onSelectTask,
  onSelectFile,
  onAddTask,
  onValidateTask,
  lastValidationResult,
}: TaskPanelProps) {
  const currentTask = tasks.find((t) => t.id === activeTaskId) || tasks[0];
  const [isCreatingCustomTask, setIsCreatingCustomTask] = useState(false);

  // Form state for creating custom task
  const [newTitle, setNewTitle] = useState('');
  const [newTargetFile, setNewTargetFile] = useState(files[0]?.name || 'index.html');
  const [newDescription, setNewDescription] = useState('');
  const [newRequirement, setNewRequirement] = useState('');

  const currentTaskIndex = tasks.findIndex((t) => t.id === currentTask?.id);
  const nextTask = tasks[currentTaskIndex + 1];

  const handleRunValidation = () => {
    if (!currentTask) return;
    onValidateTask(currentTask);
  };

  const handleNextTask = () => {
    if (nextTask) {
      onSelectTask(nextTask.id);
      onSelectFile(nextTask.targetFile);
    }
  };

  const handleSaveCustomTask = () => {
    if (!newTitle.trim() || !newDescription.trim()) return;

    const customTask: LearningTask = {
      id: `task-custom-${Date.now().toString(36)}`,
      title: newTitle.trim(),
      category: 'Custom',
      targetFile: newTargetFile,
      description: newDescription.trim(),
      criteria: [
        {
          id: 'custom-req-1',
          description: newRequirement.trim() || 'Код в файле успешно обновлен',
          check: (code) => {
            if (code.trim().length > 5) {
              return { passed: true, message: 'Код успешно написан' };
            }
            return { passed: false, message: 'Файл пуст или не содержит кода' };
          },
        },
      ],
    };

    onAddTask(customTask);
    onSelectTask(customTask.id);
    onSelectFile(customTask.targetFile);
    setIsCreatingCustomTask(false);

    setNewTitle('');
    setNewDescription('');
    setNewRequirement('');
  };

  return (
    <aside
      class="task-panel-root"
      style={width ? { width: `${width}px` } : undefined}
    >
      {/* Header */}
      <div class="task-panel-header">
        <div class="task-panel-header-title">
          <GraduationCap size={16} color="#14b8a6" />
          <span>ЦЕЛЬ УРОКА</span>
        </div>
        <button
          class="task-add-btn"
          onClick={() => setIsCreatingCustomTask((v) => !v)}
          title="Добавить задание с любым целевым файлом"
        >
          <PlusCircle size={14} />
        </button>
      </div>

      <div class="task-panel-scrollable">
        {/* Task Selector Dropdown */}
        <div class="task-selector-wrapper">
          <label class="task-selector-label">Выберите урок:</label>
          <select
            class="task-selector-select"
            value={currentTask?.id}
            onChange={(e) => {
              const nextId = (e.target as HTMLSelectElement).value;
              onSelectTask(nextId);
              const found = tasks.find((t) => t.id === nextId);
              if (found) onSelectFile(found.targetFile);
            }}
          >
            {tasks.map((task, idx) => (
              <option key={task.id} value={task.id}>
                #{idx + 1} {task.title}
              </option>
            ))}
          </select>
        </div>

        {/* Modal / Inline form to add task with any target file */}
        {isCreatingCustomTask && (
          <div class="task-custom-create-box">
            <div class="custom-create-header">
              <span>Новое задание</span>
              <button class="close-create-btn" onClick={() => setIsCreatingCustomTask(false)}>
                <X size={13} />
              </button>
            </div>

            <div class="custom-field">
              <label>Тема урока:</label>
              <input
                type="text"
                placeholder="Например: Стилизация кнопки"
                value={newTitle}
                onInput={(e) => setNewTitle((e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="custom-field">
              <label>Целевой файл:</label>
              <select
                value={newTargetFile}
                onChange={(e) => setNewTargetFile((e.target as HTMLSelectElement).value)}
              >
                {files.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div class="custom-field">
              <label>Цель урока (что нужно сделать):</label>
              <textarea
                rows={3}
                placeholder="Опишите цель урока для студента..."
                value={newDescription}
                onInput={(e) => setNewDescription((e.target as HTMLTextAreaElement).value)}
              />
            </div>

            <button class="save-custom-task-btn" onClick={handleSaveCustomTask}>
              Сохранить урок
            </button>
          </div>
        )}

        {/* Clean Task Card: Only Goal + Target File + AST Errors + Check Button */}
        {currentTask && (
          <div class="task-card">
            <div class="task-card-meta">
              <span class="task-category-badge">{currentTask.category}</span>
              <button
                class="task-target-file-pill"
                onClick={() => onSelectFile(currentTask.targetFile)}
                title="Перейти к этому файлу в редакторе"
              >
                <FileCode size={12} color="#14b8a6" />
                <span>Файл: <strong>{currentTask.targetFile}</strong></span>
              </button>
            </div>

            <h3 class="task-title">{currentTask.title}</h3>
            
            {/* Четкая цель урока */}
            <div class="task-goal-box">
              <span class="task-goal-label">ЦЕЛЬ УРОКА:</span>
              <p class="task-description">{currentTask.description}</p>
            </div>

            {/* AST Syntax Error if entire file failed parser */}
            {lastValidationResult && lastValidationResult.taskId === currentTask.id && !lastValidationResult.astSummary.syntaxValid && (
              <div class="task-ast-syntax-error">
                <AlertTriangle size={14} class="syntax-err-icon" />
                <div class="syntax-err-text">
                  <strong>Синтаксическая ошибка ({lastValidationResult.astSummary.parserName}):</strong>
                  <span>
                    {lastValidationResult.astSummary.syntaxError}{' '}
                    {lastValidationResult.astSummary.line ? `на строке ${lastValidationResult.astSummary.line}` : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Single Fail Message if not passed */}
            {lastValidationResult && lastValidationResult.taskId === currentTask.id && !lastValidationResult.allPassed && (
              <div class="task-validation-feedback">
                {lastValidationResult.criteriaResults.find((c) => !c.passed)?.message && (
                  <span class="feedback-text">
                    ⚠️ {lastValidationResult.criteriaResults.find((c) => !c.passed)?.message}
                  </span>
                )}
              </div>
            )}

            {/* Validation Action Button */}
            <div class="task-actions-box">
              {lastValidationResult?.taskId === currentTask?.id && lastValidationResult?.allPassed ? (
                <div class="task-success-banner">
                  <CheckCircle2 size={16} />
                  <span>Урок пройден успешно! 🎉</span>
                  {nextTask && (
                    <button class="next-task-btn" onClick={handleNextTask}>
                      Следующий урок <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <button class="run-validation-btn" onClick={handleRunValidation}>
                  <Play size={14} />
                  <span>Проверить решение</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
