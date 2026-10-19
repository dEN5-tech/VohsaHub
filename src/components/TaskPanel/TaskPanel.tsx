import { useState } from 'preact/hooks';
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
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
  Code2,
} from 'lucide-preact';

interface DescriptionToken {
  text: string;
  isSelector: boolean;
  cleanSelector?: string;
}

function parseDescriptionTokens(description: string): DescriptionToken[] {
  // Matches CSS class (.class), ID (#id), pseudo-classes (:pseudo), tags, <tags>, backticked code
  // Comprehensive AST-friendly token matching:
  // 1. `code`
  // 2. Full HTML tags: <tag>, <tag class="...">, </tag>, <!DOCTYPE html>
  // 3. Compound / chained CSS classes: .pricing-card.featured, .features, .modal::backdrop, .btn:hover
  // 4. Standalone pseudo-classes & pseudo-elements: :root, ::backdrop
  // 5. CSS custom properties / variables: --primary-color, --card-bg
  // 6. Attribute selectors: [open], [type="email"]
  // 7. Standalone HTML semantic tags (excluding file extensions like .html or .css)
  const regex = /(`[^`]+`|<\/?!?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*?)?\/?>|(?<=[^\w-]|^)[.#][a-zA-Z0-9_-]+(?:[.#][a-zA-Z0-9_-]+)*(?:::[a-zA-Z0-9_-]+|:[a-zA-Z0-9_-]+)?(?:\[[^\]]+\])?(?:\s+(?:summary|input|button|h[1-6]|a|p|\.[a-zA-Z0-9_-]+))?|(?<=[^\w-]|^)(?:::|:)[a-zA-Z0-9_-]+|(?<=[^\w-]|^)--[a-zA-Z0-9_-]+|(?<=[^\w-]|^)\[[a-zA-Z0-9_-]+(?:=[^\]]+)?\]|(?<![a-zA-Z0-9_-]\.)\b(?:html|body|head|header|nav|main|section|article|aside|footer|dialog|details|summary|div|span|p|a|ul|ol|li|h[1-6]|form|input|button|textarea|select|option|label|progress)\b(?:::[a-zA-Z0-9_-]+|:[a-zA-Z0-9_-]+)?(?![a-zA-Z0-9_.-]))/g;

  const tokens: DescriptionToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(description)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;
    const matchedStr = match[0];

    if (matchStart > lastIndex) {
      tokens.push({
        text: description.substring(lastIndex, matchStart),
        isSelector: false,
      });
    }

    const isFileExt = /^\.(css|html|js|json|png|svg|ts|tsx)$/i.test(matchedStr);

    if (isFileExt) {
      tokens.push({ text: matchedStr, isSelector: false });
    } else {
      let cleanSelector = matchedStr.replace(/^`|`$/g, '');
      const classAttr = cleanSelector.match(/class=["']([^"']+)["']/);
      const idAttr = cleanSelector.match(/id=["']([^"']+)["']/);
      if (classAttr) {
        cleanSelector = '.' + classAttr[1].trim().split(/\s+/)[0];
      } else if (idAttr) {
        cleanSelector = '#' + idAttr[1].trim();
      } else if (cleanSelector.startsWith('<') && cleanSelector.endsWith('>')) {
        cleanSelector = cleanSelector.replace(/^<\/?!?/, '').replace(/\/?>$/, '').trim().split(/\s+/)[0];
      }
      tokens.push({
        text: matchedStr,
        isSelector: true,
        cleanSelector,
      });
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < description.length) {
    tokens.push({
      text: description.substring(lastIndex),
      isSelector: false,
    });
  }

  return tokens;
}

function renderDescriptionWithClickableSelectors(
  description: string,
  targetFile: string,
  onNavigate: (selector: string, file: string) => void
) {
  const tokens = parseDescriptionTokens(description);

  return tokens.map((token, idx) => {
    if (!token.text) return null;
    if (token.isSelector) {
      const selectorToNavigate = token.cleanSelector || token.text;
      return (
        <button
          key={idx}
          class="inline-selector-chip"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(selectorToNavigate, targetFile);
          }}
          title={"Перейти к коду \"" + selectorToNavigate + "\" в " + targetFile}
        >
          <Code2 size={11} class="selector-icon" />
          <span class="selector-text">{token.text}</span>
        </button>
      );
    }
    return <span key={idx}>{token.text}</span>;
  });
}
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
  const [showHint, setShowHint] = useState(false);
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
              <p class="task-description">
                {renderDescriptionWithClickableSelectors(
                  currentTask.description,
                  currentTask.targetFile,
                  (selector, file) => {
                    // Если выбран хэштег или HTML элемент, а файл задачи CSS/JSON — направляем на вкладку HTML контента
                    const isHtmlTarget = selector === '#' ||
                      selector.startsWith('#') ||
                      selector.startsWith('<') ||
                      /^(html|body|head|header|nav|main|section|article|aside|footer|dialog|details|summary|div|span|p|a|ul|ol|li|h[1-6]|form|input|button|textarea|select|option|label|progress)$/i.test(selector);

                    const htmlFile = files.find((f) => f.name.toLowerCase() === 'index.html') ||
                      files.find((f) => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.eta')) ||
                      files.find((f) => /\.(jsx|tsx|vue)$/i.test(f.name));

                    const destFile = (isHtmlTarget && htmlFile && (!file || file.endsWith('.css') || file.endsWith('.json')))
                      ? htmlFile.name
                      : file;

                    if (onSelectFile && destFile) {
                      onSelectFile(destFile);
                    }
                    window.dispatchEvent(
                      new CustomEvent('vohsa:navigate-to-text', {
                        detail: { text: selector, targetFile: destFile },
                      })
                    );
                  }
                )}
              </p>
            </div>

            {/* Интерактивная подсказка к уроку */}
            {currentTask.hint && (
              <div class="task-hint-box">
                <button
                  type="button"
                  class="task-hint-toggle-btn"
                  onClick={() => setShowHint(!showHint)}
                  title="Показать подсказку к уроку"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={13} color="#fbbf24" />
                    <span>Подсказка к уроку</span>
                  </div>
                  {showHint ? <ChevronUp size={13} color="#fbbf24" /> : <ChevronDown size={13} color="#fbbf24" />}
                </button>
                {showHint && (
                  <div class="task-hint-content">
                    <p class="task-hint-text">
                      {renderDescriptionWithClickableSelectors(
                        currentTask.hint,
                        currentTask.targetFile,
                        (selector, file) => {
                          const destFile = file || currentTask.targetFile;
                          if (onSelectFile && destFile) {
                            onSelectFile(destFile);
                          }
                          window.dispatchEvent(
                            new CustomEvent('vohsa:navigate-to-text', {
                              detail: { text: selector, targetFile: destFile },
                            })
                          );
                        }
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

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
