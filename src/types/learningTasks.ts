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

export interface DeclarativeCriterion {
  id: string;
  description: string;
  passed?: boolean;
  message?: string;
  line?: number;
  column?: number;
  // Проверки на подстроку
  contains?: string;
  notContains?: string;
  // Проверка через регулярное выражение
  regex?: string;
  regexFlags?: string;
  // HTML проверки (parse5)
  selector?: string;
  hasText?: boolean | string;
  hasAttribute?: { name: string; value?: string };
  // CSS проверки (css-tree)
  cssSelector?: string;
  cssProperty?: string;
  cssValue?: string;
  cssValues?: string[];
  cssValueRegex?: string;
  // JS проверки (acorn)
  variableDeclared?: string;
  // Apache / Virtual Routing проверки (mod_rewrite)
  apacheDirective?: string;
  apachePattern?: string;
  apacheSubstitution?: string;
  apacheFlags?: string[];
  virtualRequests?: Array<{
    method?: string;
    url: string;
    expectedPath?: string;
    expectedStatus?: number;
    expectedRedirect?: string;
    description?: string;
  }>;
  // Вычисляемое выражение
  expression?: string;
  check?: (fileContent: string, files: VirtualFile[]) => {
    passed: boolean;
    message?: string;
    line?: number;
    column?: number;
  };
}

export type TaskCriterion = DeclarativeCriterion;

export interface LearningTask {
  id: string;
  title: string;
  category: 'HTML' | 'CSS' | 'JavaScript' | 'Apache' | 'DevOps' | 'Custom';
  description: string; // Цель урока
  targetFile: string; // Целевой файл
  hint?: string;
  criteria: TaskCriterion[];
  // Опциональный шаблон кода с метками [[slot:slotId]] для интерактивных инлайн-карточек
  templateCode?: string;
  slots?: Record<string, InlineSlotConfig>;
  // Метаданные источника задания (если создано / загружено из VFS)
  isFromVfs?: boolean;
  sourceFile?: string;
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