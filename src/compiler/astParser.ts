import * as acorn from 'acorn';
import * as csstree from 'css-tree';
import * as parse5 from 'parse5';

export interface AstParseResult {
  success: boolean;
  language: 'javascript' | 'css' | 'html' | 'unknown';
  parserName: string;
  ast?: any;
  error?: string;
  line?: number;
  column?: number;
}

/**
 * Парсер JavaScript в ESTree AST с помощью Acorn
 */
export function parseJsAst(code: string): AstParseResult {
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      ranges: true,
    });
    return {
      success: true,
      language: 'javascript',
      parserName: 'Acorn (ESTree)',
      ast,
    };
  } catch (err: any) {
    return {
      success: false,
      language: 'javascript',
      parserName: 'Acorn (ESTree)',
      error: err.message || String(err),
      line: err.loc?.line,
      column: err.loc?.column,
    };
  }
}

/**
 * Парсер CSS в AST с помощью css-tree
 */
export function parseCssAst(code: string): AstParseResult {
  try {
    const ast = csstree.parse(code, {
      positions: true,
      parseValue: true,
      parseCustomProperty: true,
    });
    return {
      success: true,
      language: 'css',
      parserName: 'css-tree',
      ast,
    };
  } catch (err: any) {
    return {
      success: false,
      language: 'css',
      parserName: 'css-tree',
      error: err.message || String(err),
      line: err.line,
      column: err.column,
    };
  }
}

/**
 * Парсер HTML в WHATWG AST с помощью parse5
 */
export function parseHtmlAst(code: string): AstParseResult {
  try {
    // Если содержит <html> или <!DOCTYPE, парсим как документ, иначе как фрагмент
    const isFullDoc = /<!DOCTYPE html/i.test(code) || /<html[\s>]/i.test(code);
    const ast = isFullDoc
      ? parse5.parse(code, { sourceCodeLocationInfo: true })
      : parse5.parseFragment(code, { sourceCodeLocationInfo: true });

    return {
      success: true,
      language: 'html',
      parserName: 'parse5 (WHATWG)',
      ast,
    };
  } catch (err: any) {
    return {
      success: false,
      language: 'html',
      parserName: 'parse5 (WHATWG)',
      error: err.message || String(err),
    };
  }
}

/**
 * Универсальный парсер файла по его имени
 */
export function parseFileAst(fileName: string, content: string): AstParseResult {
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.ts')) {
    return parseJsAst(content);
  }
  if (fileName.endsWith('.css') || fileName.endsWith('.scss')) {
    return parseCssAst(content);
  }
  if (fileName.endsWith('.html') || fileName.endsWith('.htm') || fileName.endsWith('.eta')) {
    return parseHtmlAst(content);
  }
  return {
    success: false,
    language: 'unknown',
    parserName: 'None',
    error: `Формат файла "${fileName}" не поддерживается для построения AST. Поддерживаются .html, .css, .js`,
  };
}
