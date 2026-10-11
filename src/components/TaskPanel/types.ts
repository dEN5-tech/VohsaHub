import type { VirtualFile } from '../../compiler/templateEngine';
import type { LearningTask, TaskValidationResult } from '../../types/learningTasks';

export interface TaskPanelProps {
  tasks: LearningTask[];
  activeTaskId: string;
  files: VirtualFile[];
  width?: number;
  onSelectTask: (taskId: string) => void;
  onSelectFile: (fileName: string) => void;
  onAddTask: (newTask: LearningTask) => void;
  onValidateTask: (task: LearningTask) => TaskValidationResult;
  lastValidationResult: TaskValidationResult | null;
  // VFS SoloLearn интеграция
  vfsTaskFileName?: string;
  vfsTaskError?: string;
  onOpenTaskFile?: (fileName: string) => void;
  onCreateTaskFile?: () => void;
  onSyncTasksToVfs?: () => void;
}
