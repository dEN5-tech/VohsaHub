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
  FileJson,
  Edit3,
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
  vfsTaskFileName,
  vfsTaskError,
  onOpenTaskFile,
  onCreateTaskFile,
  onSyncTasksToVfs,
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
          expression: 'code.trim().length > 5',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {vfsTaskFileName ? (
            <button
              class="task-add-btn"
              onClick={() => onOpenTaskFile?.(vfsTaskFileName)}
              title={`Редактировать ${vfsTaskFileName} в коде`}
            >
              <Edit3 size={13} color="#5eead4" />
            </button>
          ) : (
            <button
              class="task-add-btn"
              onClick={() => onCreateTaskFile?.()}
              title="Создать task.json в файловой системе"
            >
              <FileJson size={13} color="#5eead4" />
            </button>
          )}
          <button
            class="task-add-btn"
            onClick={() => setIsCreatingCustomTask((v) => !v)}
            title="Добавить задание с любым целевым файлом"
          >
            <PlusCircle size={14} />
          </button>
        </div>
      </div>

      {/* VFS Task file status / quick actions */}
      {vfsTaskFileName ? (
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: 'rgba(20, 184, 166, 0.08)',
            borderBottom: '1px solid rgba(20, 184, 166, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5eead4' }}>
            <FileJson size={13} />
            <span>Источник: <strong>{vfsTaskFileName}</strong></span>
          </div>
          <button
            class="chakra-button chakra-button--ghost chakra-button--xs"
            onClick={() => onOpenTaskFile?.(vfsTaskFileName)}
            style={{ fontSize: '0.7rem', padding: '2px 6px', height: 'auto', color: '#5eead4' }}
            title="Открыть файл конфигурации уроков в Monaco"
          >
            Редактировать
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(39, 39, 42, 0.5)',
            borderBottom: '1px solid rgba(63, 63, 70, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
          }}
        >
          <span style={{ color: '#a1a1aa' }}>SoloLearn в ФС:</span>
          <button
            class="chakra-button chakra-button--teal chakra-button--xs"
            onClick={() => onCreateTaskFile?.()}
            style={{ fontSize: '0.7rem', padding: '2px 8px', height: '22px' }}
            title="Создать task.json в виртуальной файловой системе и редактировать уроки в Monaco"
          >
            + Создать task.json
          </button>
        </div>
      )}

      {vfsTaskError && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
          }}
        >
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{vfsTaskError}</span>
        </div>
      )}

      <div class="task-panel-scrollable">
        {/* Task Selector Dropdown (если есть задачи) */}
        {tasks.length > 0 ? (
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
        ) : (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: '#71717a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <GraduationCap size={32} color="#52525b" />
            <div style={{ fontSize: '0.85rem' }}>
              В виртуальной файловой системе нет уроков SoloLearn.
            </div>
            <p style={{ fontSize: '0.75rem', margin: 0, color: '#a1a1aa' }}>
              Создайте <code>task.json</code> или загрузите проект по ссылке с заданиями.
            </p>
            {onCreateTaskFile && (
              <button
                class="chakra-button chakra-button--teal chakra-button--sm"
                onClick={onCreateTaskFile}
              >
                + Создать task.json
              </button>
            )}
          </div>
        )}

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

            <div style={{ display: 'flex', gap: '8px' }}>
              <button class="save-custom-task-btn" onClick={handleSaveCustomTask}>
                Сохранить урок
              </button>
            </div>
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
