import { useState, useEffect, useMemo } from 'preact/hooks';
import {
  useFileManager,
  useResizablePanels,
  useSandboxConsole,
  useGlobalShortcuts,
} from './hooks';

import { Header } from './components/Header';
import { ActivityBar } from './components/ActivityBar';
import { Explorer } from './components/Explorer';
import { TaskPanel } from './components/TaskPanel';
import { PackagePicker } from './components/PackagePicker/PackagePicker';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { ConsoleDrawer } from './components/ConsoleDrawer';
import { StatusBar } from './components/StatusBar';
import { ExportModal } from './components/ExportModal';

import {
  validateLearningTask,
  parseTasksFromVfs,
  isVfsTaskFile,
  DEFAULT_SOLOLEARN_TEMPLATE_JSON,
} from './compiler/astTaskValidator';
import type { LearningTask, TaskValidationResult } from './types/learningTasks';

/**
 * Главный корневой компонент рабочей среды VohsaHub
 */
export function App() {
  // 1. Модуль управления виртуальной файловой системой и компиляцией
  const [autoCompile, setAutoCompile] = useState<boolean>(true);
  const {
    files,
    activeFileName,
    compilationResult,
    isLoadedFromUrl,
    isSecureTask,
    setActiveFileName,
    triggerCompile,
    handleFileChange,
    handleCreateFile,
    handleDeleteFile,
    handleRenameFile,
    handleReset: resetFiles,
  } = useFileManager({ autoCompile });

  // Если в ссылке передан флаг is_s (или в payload is_s: true),
  // скрываем task.json из проводника и табов редактора, чтобы студент не мог подсмотреть тесты/ответы
  const visibleFiles = useMemo(() => {
    if (!isSecureTask) return files;
    return files.filter((f) => !isVfsTaskFile(f.name));
  }, [files, isSecureTask]);

  // 1.1 Динамическое извлечение SoloLearn задач из файлов виртуальной файловой системы (task.json / tasks.json)
  const vfsTasksData = useMemo(() => {
    return parseTasksFromVfs(files);
  }, [files]);

  // Список задач: если в VFS есть task.json, используем его, иначе пустой список
  const tasks = useMemo(() => {
    if (vfsTasksData && vfsTasksData.tasks.length > 0) {
      return vfsTasksData.tasks;
    }
    return [];
  }, [vfsTasksData]);

  const [activeTaskId, setActiveTaskId] = useState<string>('');
  const [lastValidationResult, setLastValidationResult] = useState<TaskValidationResult | null>(null);

  const [activeSidebarTab, setActiveSidebarTab] = useState<'explorer' | 'tasks' | 'packages' | null>(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.includes('project=') ||
        window.location.hash.includes('v2=') ||
        window.location.hash.includes('p=') ||
        window.location.search.includes('p=') ||
        window.location.href.includes('boost'))
    ) {
      return 'tasks';
    }
    return 'explorer';
  });

  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [mobileActivePane, setMobileActivePane] = useState<'editor' | 'preview'>('editor');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  // При изменении списка задач или загрузке по URL синхронизируем активную задачу
  useEffect(() => {
    if (tasks.length > 0) {
      let targetTaskId = activeTaskId;
      if (!targetTaskId || !tasks.some((t) => t.id === targetTaskId)) {
        targetTaskId = tasks[0].id;
        setActiveTaskId(targetTaskId);
      }
      // Если проект загружен по URL со ссылкой или открыт task.json, открываем валидацию и активируем файл урока
      if (isLoadedFromUrl) {
        setActiveSidebarTab('tasks');
        const currentTask = tasks.find((t) => t.id === targetTaskId) || tasks[0];
        if (currentTask && currentTask.targetFile && files.some((f) => f.name === currentTask.targetFile)) {
          setActiveFileName(currentTask.targetFile);
        }
      }
    } else {
      setActiveTaskId('');
      setLastValidationResult(null);
    }
  }, [tasks, isLoadedFromUrl]);

  // Функция быстрого создания файла урока task.json в виртуальной файловой системе
  const handleCreateTaskFile = () => {
    const existing = files.find((f) => isVfsTaskFile(f.name));
    if (existing) {
      setActiveFileName(existing.name);
      setActiveSidebarTab('tasks');
      return;
    }
    const name = 'task.json';
    handleCreateFile(name);
    handleFileChange(name, DEFAULT_SOLOLEARN_TEMPLATE_JSON);
    setActiveFileName(name);
    setActiveSidebarTab('tasks');
  };

  // 3. Модуль ресайзинга панелей (Explorer и Editor/Preview Split)
  const {
    explorerWidth,
    splitPercent,
    isResizing,
    mainSplitContainerRef,
    handleExplorerResizeStart,
    handleSplitResizeStart,
    resetExplorerWidth,
    resetSplitPercent,
  } = useResizablePanels();

  // 4. Модуль перехвата консоли песочницы
  const {
    consoleEntries,
    isConsoleOpen,
    setIsConsoleOpen,
    clearConsole,
  } = useSandboxConsole();

  // 5. Глобальные клавиатурные сокращения
  useGlobalShortcuts({
    onRunCompile: () => triggerCompile(),
    onToggleExplorer: () => setActiveSidebarTab((prev) => (prev ? null : 'explorer')),
  });

  const handleFullReset = () => {
    resetFiles();
    clearConsole();
    setLastValidationResult(null);
  };

  const handleValidateTask = (task: LearningTask): TaskValidationResult => {
    const result = validateLearningTask(task, files);
    setLastValidationResult(result);
    return result;
  };

  const handleSelectTask = (taskId: string) => {
    setActiveTaskId(taskId);
    setLastValidationResult(null);
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask && targetTask.targetFile) {
      setActiveFileName(targetTask.targetFile);
    }
  };

  const handleAddTask = (newTask: LearningTask) => {
    // Сохраняем задачу прямо в task.json виртуальной файловой системы!
    const taskFileName = vfsTasksData?.sourceFileName || 'task.json';
    const existingFile = files.find((f) => f.name === taskFileName);
    
    let currentPayload: any = { tasks: [] };
    if (existingFile && existingFile.content.trim()) {
      try {
        const parsed = JSON.parse(existingFile.content);
        if (Array.isArray(parsed)) {
          currentPayload = { tasks: parsed };
        } else if (parsed && Array.isArray(parsed.tasks)) {
          currentPayload = parsed;
        }
      } catch (e) {
        currentPayload = { tasks: [] };
      }
    }

    const updatedTasks = [...currentPayload.tasks, {
      id: newTask.id,
      title: newTask.title,
      category: newTask.category,
      targetFile: newTask.targetFile,
      description: newTask.description,
      criteria: newTask.criteria.map((c) => ({
        id: c.id,
        description: c.description,
        contains: c.contains,
        notContains: c.notContains,
        regex: c.regex,
        selector: c.selector,
        expression: c.expression,
      })),
    }];

    const newJson = JSON.stringify({ tasks: updatedTasks }, null, 2);

    if (existingFile) {
      handleFileChange(taskFileName, newJson);
    } else {
      handleCreateFile(taskFileName);
      handleFileChange(taskFileName, newJson);
    }

    setActiveTaskId(newTask.id);
    if (newTask.targetFile) {
      setActiveFileName(newTask.targetFile);
    }
  };

  return (
    <div class="vohsa-app">
      <Header
        activeFileName={activeFileName}
        autoCompile={autoCompile}
        onToggleAutoCompile={() => setAutoCompile((v) => !v)}
        onRunCompile={() => triggerCompile()}
        onOpenExport={() => setIsExportOpen(true)}
        viewportMode={viewportMode}
        onChangeViewport={setViewportMode}
        mobileActivePane={mobileActivePane}
        onChangeMobileActivePane={setMobileActivePane}
      />

      <div class={`app-workspace ${isResizing ? 'is-resizing' : ''} ${activeSidebarTab ? 'has-sidebar-open' : ''}`}>
        <ActivityBar
          activeSidebarTab={activeSidebarTab}
          onSelectSidebarTab={(tab) =>
            setActiveSidebarTab((prev) => (prev === tab ? null : tab))
          }
          isConsoleOpen={isConsoleOpen}
          onToggleConsole={() => setIsConsoleOpen((v) => !v)}
          onReset={handleFullReset}
          hasTasksBadge={tasks.length > 0}
        />

        {activeSidebarTab === 'explorer' && (
          <>
            <Explorer
              files={visibleFiles}
              activeFileName={activeFileName}
              width={explorerWidth}
              onSelectFile={(name) => {
                setActiveFileName(name);
                setMobileActivePane('editor');
              }}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              onCreateTaskFile={isSecureTask ? undefined : handleCreateTaskFile}
            />
            <div
              class={`trimmer-gutter trimmer-gutter--explorer ${isResizing ? 'active' : ''}`}
              onMouseDown={handleExplorerResizeStart}
              onDblClick={resetExplorerWidth}
              title="Перетащите для изменения ширины (двойной клик: 240px)"
            >
              <div class="trimmer-line" />
            </div>
          </>
        )}

        {activeSidebarTab === 'tasks' && (
          <>
            <TaskPanel
              tasks={tasks}
              activeTaskId={activeTaskId}
              files={files}
              width={explorerWidth}
              onSelectTask={handleSelectTask}
              onSelectFile={(name) => {
                setActiveFileName(name);
                setMobileActivePane('editor');
              }}
              onAddTask={handleAddTask}
              onValidateTask={handleValidateTask}
              lastValidationResult={lastValidationResult}
              vfsTaskFileName={isSecureTask ? undefined : vfsTasksData?.sourceFileName}
              vfsTaskError={vfsTasksData?.parseError}
              onOpenTaskFile={isSecureTask ? undefined : (name) => {
                setActiveFileName(name);
                setMobileActivePane('editor');
              }}
              onCreateTaskFile={isSecureTask ? undefined : handleCreateTaskFile}
            />
            <div
              class={`trimmer-gutter trimmer-gutter--explorer ${isResizing ? 'active' : ''}`}
              onMouseDown={handleExplorerResizeStart}
              onDblClick={resetExplorerWidth}
              title="Перетащите для изменения ширины (двойной клик: 240px)"
            >
              <div class="trimmer-line" />
            </div>
          </>
        )}

        {activeSidebarTab === 'packages' && (
          <>
            <PackagePicker
              files={files}
              width={explorerWidth}
              onUpdateFile={handleFileChange}
              onCreateFile={handleCreateFile}
              onSelectFile={(name) => {
                setActiveFileName(name);
                setMobileActivePane('editor');
              }}
            />
            <div
              class={`trimmer-gutter trimmer-gutter--explorer ${isResizing ? 'active' : ''}`}
              onMouseDown={handleExplorerResizeStart}
              onDblClick={resetExplorerWidth}
              title="Перетащите для изменения ширины (двойной клик: 240px)"
            >
              <div class="trimmer-line" />
            </div>
          </>
        )}

        <main
          class={`main-split-container mobile-active-${mobileActivePane}`}
          ref={mainSplitContainerRef}
        >
          <div
            class="editor-pane-container"
            style={{ width: `${splitPercent}%`, flex: 'none' }}
          >
            <EditorPane
              files={visibleFiles}
              activeFileName={activeFileName}
              onSelectFile={setActiveFileName}
              onFileChange={handleFileChange}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              onCursorChange={setCursorPos}
              taskValidationResult={lastValidationResult}
              activeTask={tasks.find((t) => t.id === activeTaskId)}
              onLoadTaskTemplate={(task) => {
                if (task.templateCode && task.targetFile) {
                  handleFileChange(task.targetFile, task.templateCode);
                }
              }}
            />
          </div>

          <div
            class={`trimmer-gutter trimmer-gutter--split ${isResizing ? 'active' : ''}`}
            onMouseDown={handleSplitResizeStart}
            onDblClick={resetSplitPercent}
            title="Перетащите для изменения пропорций (двойной клик: 50%)"
          >
            <div class="trimmer-line" />
          </div>

          <div
            class="preview-pane-container"
            style={{ width: `${100 - splitPercent}%`, flex: 'none' }}
          >
            <PreviewPane
              compilationResult={compilationResult}
              viewportMode={viewportMode}
              onReload={() => triggerCompile()}
              snippetTitle="Песочница"
            />
          </div>
        </main>
      </div>

      <ConsoleDrawer
        isOpen={isConsoleOpen}
        onToggle={() => setIsConsoleOpen((prev) => !prev)}
        entries={consoleEntries}
        onClear={clearConsole}
      />

      <StatusBar
        compilationResult={compilationResult}
        activeFileName={activeFileName}
        cursorPos={cursorPos}
        autoCompile={autoCompile}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        snippetTitle="Песочница"
        files={files}
      />
    </div>
  );
}

export default App;
