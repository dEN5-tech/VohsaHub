export type SlotType = 'select' | 'chips' | 'input' | 'regex';

export interface InlineSlotConfig {
  id: string;
  type: SlotType;
  options?: string[]; // Для select и chips
  placeholder?: string;
  correctAnswer: string;
  regexPattern?: string; // Для regex проверки
  hint?: string;
  explanation?: string;
}

export interface SyntaxDrillSnippet {
  id: string;
  title: string;
  targetFile: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  // Код с метками вида [[slot:id]]
  templateCode: string;
  slots: Record<string, InlineSlotConfig>;
}
