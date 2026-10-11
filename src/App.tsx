import { useState } from 'preact/hooks';
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
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { ConsoleDrawer } from './components/ConsoleDrawer';
import { StatusBar } from './components/StatusBar';
import { ExportModal } from './components/ExportModal';

import { DEFAULT_LEARNING_TASKS } from './data/learningCurriculum';
import { validateLearningTask } from './compiler/astTaskValidator';
import type { LearningTask, TaskValidationResult } from './types/learningTasks';

/**
 * Главный корневой компонент рабочей среды VohsaHub
 */
export function App() {
  // 1. Состояние UI окружения
  const [activeSidebarTab, setActiveSidebarTab] = useState<'explorer' | 'tasks' | null>('tasks');
  const [autoCompile, setAutoCompile] = useState<boolean>(true);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  // 1.1 Состояние учебных практических задач (SoloLearn режим)
  const [tasks, setTasks] = useState<LearningTask[]>(DEFAULT_LEARNING_TASKS);
  const [activeTaskId, setActiveTaskId] = useState<string>(DEFAULT_LEARNING_TASKS[0]?.id || '');
  const [lastValidationResult, setLastValidationResult] = useState<TaskValidationResult | null>(null);

  // 2. Модуль управления виртуальной файловой системой и компиляцией
  const {
    files,
    activeFileName,
    compilationResult,
    setActiveFileName,
    triggerCompile,
    handleFileChange,
    handleCreateFile,
    handleDeleteFile,
    handleRenameFile,
    handleReset: resetFiles,
  } = useFileManager({ autoCompile });

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
    setTasks((prev) => [...prev, newTask]);
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
      />

      <div class={`app-workspace ${isResizing ? 'is-resizing' : ''}`}>
        <ActivityBar
          activeSidebarTab={activeSidebarTab}
          onSelectSidebarTab={(tab) =>
            setActiveSidebarTab((prev) => (prev === tab ? null : tab))
          }
          isConsoleOpen={isConsoleOpen}
          onToggleConsole={() => setIsConsoleOpen((v) => !v)}
          onReset={handleFullReset}
        />

        {activeSidebarTab === 'explorer' && (
          <>
            <Explorer
              files={files}
              activeFileName={activeFileName}
              width={explorerWidth}
              onSelectFile={setActiveFileName}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
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
              onSelectFile={setActiveFileName}
              onAddTask={handleAddTask}
              onValidateTask={handleValidateTask}
              lastValidationResult={lastValidationResult}
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

        <main class="main-split-container" ref={mainSplitContainerRef}>
          <div
            class="editor-pane-container"
            style={{ width: `${splitPercent}%`, flex: 'none' }}
          >
            <EditorPane
              files={files}
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
