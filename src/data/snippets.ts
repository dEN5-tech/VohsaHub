import type { VirtualFile } from '../compiler/templateEngine';

/**
 * Исходный список файлов по умолчанию.
 * Для чистого редактора без захардкоженного кода (empty default view).
 */
export const INITIAL_FILES: VirtualFile[] = [
  {
    name: 'index.html',
    content: '',
  },
  {
    name: 'style.css',
    content: '',
  },
  {
    name: 'main.js',
    content: '',
  },
];
