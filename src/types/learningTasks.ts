import type { VirtualFile } from '../compiler/templateEngine';

export type SlotType = 'select' | 'chips' | 'input';

export interface InlineSlotConfig {
  id: string;
  type: SlotType;
  options?: string[]; // Для select и chips
  placeholder?: string;
  correctAnswer?: string;
  hint?: string;
}

export interface TaskCriterion {
  id: string;
  description: string;
  passed?: boolean;
  message?: string;
  line?: number;
  column?: number;
  check: (fileContent: string, files: VirtualFile[]) => {
    passed: boolean;
    message?: string;
    line?: number;
    column?: number;
  };
}

export interface LearningTask {
  id: string;
  title: string;
  category: 'HTML' | 'CSS' | 'JavaScript' | 'Custom';
  description: string; // Цель урока
  targetFile: string; // Целевой файл
  hint?: string;
  criteria: TaskCriterion[];
  // Опциональный шаблон кода с метками [[slot:slotId]] для интерактивных инлайн-карточек
  templateCode?: string;
  slots?: Record<string, InlineSlotConfig>;
}

export interface TaskValidationResult {
  taskId: string;
  targetFile: string;
  allPassed: boolean;
  criteriaResults: Array<{
    id: string;
    description: string;
    passed: boolean;
    message?: string;
    line?: number;
    column?: number;
  }>;
  astSummary: {
    parserName: string;
    syntaxValid: boolean;
    syntaxError?: string;
    line?: number;
    column?: number;
  };
}
