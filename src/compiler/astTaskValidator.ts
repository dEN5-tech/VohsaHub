import * as acorn from 'acorn';
import * as csstree from 'css-tree';
import * as parse5 from 'parse5';
import type { VirtualFile } from './templateEngine';
import type { LearningTask, TaskValidationResult } from '../types/learningTasks';

/**
 * Валидатор кода по заданию студента с использованием 3 AST-модулей (parse5, css-tree, acorn)
 */

export function parseHtmlTree(code: string): { success: boolean; ast?: any; error?: string } {
  try {
    const isFullDoc = /<!DOCTYPE html/i.test(code) || /<html[\s>]/i.test(code);
    const ast = isFullDoc
      ? parse5.parse(code, { sourceCodeLocationInfo: true })
      : parse5.parseFragment(code, { sourceCodeLocationInfo: true });
    return { success: true, ast };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export function parseCssTree(code: string): { success: boolean; ast?: any; error?: string; line?: number; column?: number } {
  try {
    const ast = csstree.parse(code, { positions: true });
    return { success: true, ast };
  } catch (e: any) {
    return { success: false, error: e.message || String(e), line: e.line, column: e.column };
  }
}

export function parseJsTree(code: string): { success: boolean; ast?: any; error?: string; line?: number; column?: number } {
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      ranges: true,
    });
    return { success: true, ast };
  } catch (e: any) {
    return { success: false, error: e.message || String(e), line: e.loc?.line, column: e.loc?.column };
  }
}

// -----------------------------------------------------------------------------
// AST Query Helpers
// -----------------------------------------------------------------------------

/**
 * Ищет HTML элементы по имени тега в AST parse5
 */
export function queryHtmlElements(node: any, tagName: string, results: any[] = []): any[] {
  if (!node) return results;
  if (node.tagName && node.tagName.toLowerCase() === tagName.toLowerCase()) {
    results.push(node);
  }
  if (node.childNodes && Array.isArray(node.childNodes)) {
    for (const child of node.childNodes) {
      queryHtmlElements(child, tagName, results);
    }
  }
  return results;
}

/**
 * Извлекает текстовое содержимое HTML узла parse5
 */
export function getHtmlNodeText(node: any): string {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value || '';
  if (node.childNodes && Array.isArray(node.childNodes)) {
    return node.childNodes.map(getHtmlNodeText).join('');
  }
  return '';
}

/**
 * Ищет CSS-правило в AST css-tree
 */
export function queryCssRules(ast: any, selectorSubstring: string): any[] {
  const matched: any[] = [];
  if (!ast) return matched;

  csstree.walk(ast, (node: any) => {
    if (node.type === 'Rule' && node.prelude) {
      const preludeStr = csstree.generate(node.prelude).toLowerCase();
      if (preludeStr.includes(selectorSubstring.toLowerCase())) {
        matched.push(node);
      }
    }
  });

  return matched;
}

/**
 * Проверяет наличие CSS свойства внутри правила
 */
export function getCssProperty(ruleNode: any, propertyName: string): any | undefined {
  if (!ruleNode || !ruleNode.block) return undefined;
  let found: any = undefined;

  csstree.walk(ruleNode.block, (node: any) => {
    if (node.type === 'Declaration' && node.property.toLowerCase() === propertyName.toLowerCase()) {
      found = node;
    }
  });

  return found;
}

/**
 * Обходит JS AST (ESTree от Acorn)
 */
export function walkJsAst(node: any, visitor: (n: any) => boolean | void) {
  if (!node || typeof node !== 'object') return;
  const stop = visitor(node);
  if (stop === true) return;

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range') continue;
    const val = node[key];
    if (Array.isArray(val)) {
      for (const item of val) walkJsAst(item, visitor);
    } else if (val && typeof val === 'object') {
      walkJsAst(val, visitor);
    }
  }
}

// -----------------------------------------------------------------------------
// Главная функция валидации таска
// -----------------------------------------------------------------------------

export function validateLearningTask(task: LearningTask, files: VirtualFile[]): TaskValidationResult {
  // Находим целевой файл задания
  const targetFile = files.find((f) => f.name.toLowerCase() === task.targetFile.toLowerCase()) ||
                     files.find((f) => f.name.toLowerCase().endsWith(task.targetFile.toLowerCase()));

  const content = targetFile?.content || '';

  let parserName = 'None';
  let syntaxValid = true;
  let syntaxError: string | undefined;
  let syntaxLine: number | undefined;
  let syntaxColumn: number | undefined;

  if (task.targetFile.endsWith('.html') || task.targetFile.endsWith('.htm')) {
    parserName = 'parse5 (WHATWG)';
    const parsed = parseHtmlTree(content);
    syntaxValid = parsed.success;
    syntaxError = parsed.error;
  } else if (task.targetFile.endsWith('.css') || task.targetFile.endsWith('.scss')) {
    parserName = 'css-tree';
    const parsed = parseCssTree(content);
    syntaxValid = parsed.success;
    syntaxError = parsed.error;
    syntaxLine = parsed.line;
    syntaxColumn = parsed.column;
  } else if (task.targetFile.endsWith('.js') || task.targetFile.endsWith('.ts')) {
    parserName = 'Acorn (ESTree)';
    const parsed = parseJsTree(content);
    syntaxValid = parsed.success;
    syntaxError = parsed.error;
    syntaxLine = parsed.line;
    syntaxColumn = parsed.column;
  }

  // Запуск критериев проверки
  const criteriaResults = task.criteria.map((criterion) => {
    try {
      const res = criterion.check(content, files);
      return {
        id: criterion.id,
        description: criterion.description,
        passed: res.passed,
        message: res.message,
        line: res.line,
        column: res.column,
      };
    } catch (err: any) {
      return {
        id: criterion.id,
        description: criterion.description,
        passed: false,
        message: `Ошибка проверки: ${err.message}`,
      };
    }
  });

  const allPassed = syntaxValid && criteriaResults.every((c) => c.passed);

  return {
    taskId: task.id,
    targetFile: task.targetFile,
    allPassed,
    criteriaResults,
    astSummary: {
      parserName,
      syntaxValid,
      syntaxError,
      line: syntaxLine,
      column: syntaxColumn,
    },
  };
}
