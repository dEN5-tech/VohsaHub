import * as acorn from 'acorn';
import * as csstree from 'css-tree';
import * as parse5 from 'parse5';
import type { VirtualFile } from './templateEngine';
import type { LearningTask, TaskCriterion, TaskValidationResult } from '../types/learningTasks';

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
 * Структура распарсенного сегмента CSS-селектора для HTML AST
 */
interface SelectorSegment {
  tag?: string;
  id?: string;
  classes: string[];
  attributes: { name: string; value?: string }[];
}

function parseSelectorSegment(segment: string): SelectorSegment {
  let tag: string | undefined;
  const classes: string[] = [];
  const attributes: { name: string; value?: string }[] = [];
  let id: string | undefined;

  const attrRegex = /\[([a-zA-Z0-9_-]+)(?:=["']?([^"'\]]+)["']?)?\]/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(segment)) !== null) {
    attributes.push({ name: attrMatch[1], value: attrMatch[2] });
  }
  const cleanSeg = segment.replace(attrRegex, '');

  const tagMatch = cleanSeg.match(/^[a-zA-Z0-9_-]+/);
  if (tagMatch) tag = tagMatch[0];

  const idMatch = cleanSeg.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) id = idMatch[1];

  const classMatches = cleanSeg.matchAll(/\.([a-zA-Z0-9_-]+)/g);
  for (const cm of classMatches) classes.push(cm[1]);

  return { tag, id, classes, attributes };
}

function matchesElement(el: any, part: SelectorSegment): boolean {
  if (!el || !el.tagName) return false;

  if (part.tag && part.tag !== '*' && el.tagName.toLowerCase() !== part.tag.toLowerCase()) {
    return false;
  }

  if (part.id) {
    const hasId = el.attrs?.some((a: any) => a.name === 'id' && a.value === part.id);
    if (!hasId) return false;
  }

  if (part.classes.length > 0) {
    const classAttr = el.attrs?.find((a: any) => a.name === 'class')?.value || '';
    const classList = classAttr.trim().split(/\s+/);
    for (const cls of part.classes) {
      if (!classList.includes(cls)) return false;
    }
  }

  if (part.attributes.length > 0) {
    for (const attr of part.attributes) {
      const hasAttr = el.attrs?.some(
        (a: any) => a.name === attr.name && (attr.value === undefined || a.value === attr.value)
      );
      if (!hasAttr) return false;
    }
  }

  return true;
}

export function queryHtmlSelector(ast: any, fullSelector: string): any[] {
  if (!ast) return [];
  const segments = fullSelector.trim().split(/\s+/).filter(Boolean);
  if (segments.length === 0) return [];

  const parsedSegments = segments.map(parseSelectorSegment);

  let currentMatched: any[] = [];
  const collectAll = (node: any) => {
    if (!node) return;
    if (matchesElement(node, parsedSegments[0])) {
      currentMatched.push(node);
    }
    if (node.childNodes && Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) collectAll(child);
    }
  };
  collectAll(ast);

  for (let i = 1; i < parsedSegments.length; i++) {
    const nextPart = parsedSegments[i];
    const nextMatched: any[] = [];

    for (const parent of currentMatched) {
      const collectDescendants = (node: any) => {
        if (!node) return;
        if (node.childNodes && Array.isArray(node.childNodes)) {
          for (const child of node.childNodes) {
            if (matchesElement(child, nextPart)) {
              if (!nextMatched.includes(child)) {
                nextMatched.push(child);
              }
            }
            collectDescendants(child);
          }
        }
      };
      collectDescendants(parent);
    }

    currentMatched = nextMatched;
    if (currentMatched.length === 0) break;
  }

  return currentMatched;
}

/**
 * Ищет HTML элементы по имени тега в AST parse5
 */
export function queryHtmlElements(node: any, tagName: string, results: any[] = []): any[] {
  if (!node) return results;
  if (node.tagName && (tagName === '*' || node.tagName.toLowerCase() === tagName.toLowerCase())) {
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

/**
 * Проверяет общую синтаксическую и семантическую корректность значения CSS свойства
 */
export function checkGeneralCssValueValidity(
  prop: string,
  val: string
): { valid: boolean; reason?: string } {
  const p = prop.toLowerCase();
  const v = val.toLowerCase().trim();

  // Глобальные допустимые ключевые слова CSS
  if (['inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(v)) {
    return { valid: true };
  }

  switch (p) {
    case 'display': {
      const allowed = [
        'block', 'inline', 'inline-block', 'flex', 'inline-flex',
        'grid', 'inline-grid', 'none', 'contents', 'table',
        'table-row', 'table-cell', 'list-item', 'flow-root'
      ];
      if (!allowed.includes(v)) {
        return {
          valid: false,
          reason: `"${val}" не является допустимым типом отображения (ожидались: grid, flex, inline-block, block и т.д.).`,
        };
      }
      break;
    }

    case 'cursor': {
      const allowed = [
        'pointer', 'default', 'auto', 'none', 'help', 'wait',
        'crosshair', 'not-allowed', 'grab', 'grabbing', 'move', 'text', 'zoom-in', 'zoom-out'
      ];
      if (!allowed.includes(v)) {
        return {
          valid: false,
          reason: `"${val}" не является допустимым значением курсора (ожидались: pointer, default, not-allowed и т.д.).`,
        };
      }
      break;
    }

    case 'grid-template-columns':
    case 'grid-template-rows': {
      const hasTrack = /(repeat|minmax|fit-content|\d+(?:fr|px|rem|em|%|vw|vh)|auto|none)/i.test(v);
      if (!hasTrack) {
        return {
          valid: false,
          reason: `Значение не является корректным шаблоном колонок сетки (ожидались: fr, px, repeat(2, 1fr) и т.д.).`,
        };
      }
      break;
    }

    case 'gap':
    case 'row-gap':
    case 'column-gap': {
      const hasUnit = /(normal|0|\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|ch)|calc|var|min|max|clamp)/i.test(v);
      if (!hasUnit) {
        return {
          valid: false,
          reason: `Интервал gap должен содержать размер с единицами измерения (например: 16px, 1.5rem, 20px).`,
        };
      }
      break;
    }

    case 'border-radius': {
      const hasUnit = /(0|\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw)|calc|var)/i.test(v);
      if (!hasUnit) {
        return {
          valid: false,
          reason: `Радиус скругления border-radius должен содержать число с единицами измерения (например: 8px, 12px, 50%, 9999px).`,
        };
      }
      break;
    }

    case 'padding':
    case 'margin':
    case 'font-size':
    case 'width':
    case 'height':
    case 'min-width':
    case 'max-width': {
      const hasUnit = /(auto|none|0|\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|ch|pt)|calc|var|fit-content|max-content)/i.test(v);
      if (!hasUnit) {
        return {
          valid: false,
          reason: `Значение свойства "${prop}" должно содержать размер с единицами измерения (px, rem, % и т.д.).`,
        };
      }
      break;
    }

    case 'color':
    case 'background-color':
    case 'border-color': {
      const isColor = /(#|rgba?|hsla?|transparent|currentcolor|var\(--|[a-z]{3,})/i.test(v);
      if (!isColor) {
        return {
          valid: false,
          reason: `Значение должно быть цветом (HEX #..., rgb(...), var(...) или именем цвета).`,
        };
      }
      break;
    }

    case 'transition': {
      const hasTiming = /(0|\d+(?:\.\d+)?(?:s|ms)|all|ease|linear|cubic-bezier)/i.test(v);
      if (!hasTiming) {
        return {
          valid: false,
          reason: `Переход transition должен содержать время (например: all 0.2s ease или 300ms).`,
        };
      }
      break;
    }

    case 'box-shadow': {
      const hasShadow = /(none|0|\d+(?:\.\d+)?(?:px|rem|em)|rgba?|#[0-9a-fA-F]|inset)/i.test(v);
      if (!hasShadow) {
        return {
          valid: false,
          reason: `Тень box-shadow должна содержать смещения (например: 0 4px 6px rgba(0,0,0,0.1)).`,
        };
      }
      break;
    }

    case 'text-decoration':
    case 'text-decoration-line': {
      const hasDec = /(none|underline|overline|line-through)/i.test(v);
      if (!hasDec) {
        return {
          valid: false,
          reason: `Значение text-decoration должно быть none, underline или line-through.`,
        };
      }
      break;
    }
  }

  // Значение не должно состоять только из спецсимволов или бессмысленных знаков
  if (v.length < 1 || /^[^a-zA-Z0-9#]+$/.test(v)) {
    return {
      valid: false,
      reason: `Значение "${val}" некорректно.`,
    };
  }

  return { valid: true };
}

/**
 * Валидирует значение CSS свойства против критерия задания
 */
export function validateCssPropertyValue(
  decl: any,
  ruleNode: any,
  propName: string,
  criterion: TaskCriterion
): { passed: boolean; message?: string; line?: number } {
  const line = decl.loc?.start?.line || ruleNode.loc?.start?.line;
  if (!decl.value) {
    return {
      passed: false,
      message: `Свойство "${criterion.cssProperty}" в селекторе "${criterion.cssSelector}" не имеет значения.`,
      line,
    };
  }

  const rawVal = csstree.generate(decl.value).trim();
  if (!rawVal || rawVal === '') {
    return {
      passed: false,
      message: `Свойство "${criterion.cssProperty}" в селекторе "${criterion.cssSelector}" пустое.`,
      line,
    };
  }

  const normActual = rawVal.toLowerCase().replace(/\s+/g, ' ').replace(/\s*;\s*$/, '').trim();

  // 1. Определение списка допустимых вариантов значений
  let expectedOptions: string[] = [];

  if (criterion.cssValues && Array.isArray(criterion.cssValues) && criterion.cssValues.length > 0) {
    expectedOptions = criterion.cssValues.map((v) => v.toLowerCase().trim());
  } else if (criterion.cssValue) {
    expectedOptions = criterion.cssValue
      .split('|')
      .map((v) => v.toLowerCase().trim())
      .filter(Boolean);
  } else {
    // 2. Интеллектуальное извлечение требований из описания и подсказок критерия
    const context = `${criterion.message || ''} ${criterion.description || ''}`.toLowerCase();

    // А. Поиск явной сигнатуры "свойство: значение" в тексте сообщения
    const propEscaped = propName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\export function walkJsAst');
    const directPattern = new RegExp(`${propEscaped}\\s*:\\s*([^;,.!\\n]+)`, 'i');
    const directMatch = context.match(directPattern);
    if (directMatch && directMatch[1]) {
      const candidate = directMatch[1].trim().toLowerCase();
      if (!candidate.includes('...') && !candidate.includes('значение') && !candidate.includes('любое')) {
        expectedOptions = candidate.split('|').map((v) => v.trim()).filter(Boolean);
      }
    }

    // Б. Семантические ключевые подсказки
    if (expectedOptions.length === 0) {
      if (propName === 'display') {
        if (context.includes('строчно-блочн') || context.includes('inline-block')) {
          expectedOptions = ['inline-block', 'inline-flex'];
        } else if (context.includes('сетк') || context.includes('grid') || context.includes('двумерн')) {
          expectedOptions = ['grid', 'inline-grid'];
        } else if (context.includes('флекс') || context.includes('flex')) {
          expectedOptions = ['flex', 'inline-flex'];
        } else if (context.includes('скрыт') || context.includes('убрать') || context.includes('none')) {
          expectedOptions = ['none'];
        }
      } else if (propName === 'text-decoration') {
        if (context.includes('уберите') || context.includes('отключ') || context.includes('без') || context.includes('none')) {
          expectedOptions = ['none'];
        }
      } else if (propName === 'outline') {
        if (context.includes('уберите') || context.includes('отключ') || context.includes('без') || context.includes('none')) {
          expectedOptions = ['none', '0'];
        }
      } else if (propName === 'cursor') {
        if (context.includes('указател') || context.includes('курсор') || context.includes('pointer')) {
          expectedOptions = ['pointer'];
        }
      }
    }
  }

  // 3. Проверка по regex, если задан
  if (criterion.cssValueRegex) {
    try {
      const rx = new RegExp(criterion.cssValueRegex, 'i');
      if (!rx.test(normActual)) {
        return {
          passed: false,
          message:
            criterion.message ||
            `Значение "${rawVal}" свойства "${criterion.cssProperty}" в "${criterion.cssSelector}" не соответствует требуемому формату.`,
          line,
        };
      }
      return {
        passed: true,
        message: criterion.message || `CSS свойство "${criterion.cssProperty}: ${rawVal}" подтверждено в "${criterion.cssSelector}"`,
        line,
      };
    } catch (e: any) {
      // fallback
    }
  }

  // 4. Если заданы или выведены ожидаемые значения
  if (expectedOptions.length > 0) {
    const isMatched = expectedOptions.some((opt) => {
      const cleanOpt = opt.replace(/\s+/g, " ").trim();
      const cleanActual = normActual.replace(/\s+/g, " ").trim();
      if (cleanOpt === cleanActual) return true;
      const escapedOpt = cleanOpt.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const isUnit = /^(px|rem|em|%|fr|vw|vh|ms|s|deg)$/i.test(cleanOpt);
      const prefix = isUnit ? "(^|[\\s,(]|\\d)" : "(^|[\\s,(])";
      const rx = new RegExp(prefix + escapedOpt + "([\\s,)>]|$)", "i");
      return rx.test(cleanActual);
    });

    if (!isMatched) {
      const optionsDisplay = expectedOptions.join(' или ');
      return {
        passed: false,
        message:
          criterion.message ||
          `Для селектора "${criterion.cssSelector}" свойство "${criterion.cssProperty}" имеет значение "${rawVal}", но ожидалось: "${optionsDisplay}".`,
        line,
      };
    }

    return {
      passed: true,
      message: criterion.message || `CSS свойство "${criterion.cssProperty}: ${rawVal}" подтверждено в "${criterion.cssSelector}"`,
      line,
    };
  }

  // 5. Общая семантическая валидация корректности CSS значения
  const validity = checkGeneralCssValueValidity(propName, normActual);
  if (!validity.valid) {
    return {
      passed: false,
      message:
        criterion.message ||
        `Значение "${rawVal}" для свойства "${criterion.cssProperty}" в "${criterion.cssSelector}" некорректно: ${validity.reason}`,
      line,
    };
  }

  return {
    passed: true,
    message: criterion.message || `CSS свойство "${criterion.cssProperty}: ${rawVal}" подтверждено в "${criterion.cssSelector}"`,
    line,
  };
}

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
// Компиляция декларативных критериев из JSON
// -----------------------------------------------------------------------------

export function compileCriterionCheck(
  criterion: TaskCriterion
): (code: string, files: VirtualFile[]) => { passed: boolean; message?: string; line?: number; column?: number } {
  if (typeof criterion.check === 'function') {
    return criterion.check;
  }

  return (code: string, files: VirtualFile[]) => {
    // 1. Проверка на обязательное наличие подстроки
    if (criterion.contains !== undefined) {
      if (!code.includes(criterion.contains)) {
        return {
          passed: false,
          message: criterion.message || `Код должен содержать: "${criterion.contains}"`,
        };
      }
      const line = code.substring(0, code.indexOf(criterion.contains)).split('\n').length;
      return {
        passed: true,
        message: criterion.message || `Найдено: "${criterion.contains}"`,
        line,
      };
    }

    // 2. Проверка на отсутствие подстроки
    if (criterion.notContains !== undefined) {
      if (code.includes(criterion.notContains)) {
        const line = code.substring(0, code.indexOf(criterion.notContains)).split('\n').length;
        return {
          passed: false,
          message: criterion.message || `Код не должен содержать: "${criterion.notContains}"`,
          line,
        };
      }
      return {
        passed: true,
        message: criterion.message || `Запрещенный фрагмент "${criterion.notContains}" отсутствует`,
      };
    }

    // 3. Регулярное выражение
    if (criterion.regex !== undefined) {
      try {
        const rx = new RegExp(criterion.regex, criterion.regexFlags || 'i');
        const match = rx.exec(code);
        if (!match) {
          return {
            passed: false,
            message: criterion.message || `Код не соответствует шаблону: ${criterion.regex}`,
          };
        }
        const line = code.substring(0, match.index).split('\n').length;
        return {
          passed: true,
          message: criterion.message || `Соответствует шаблону: ${criterion.regex}`,
          line,
        };
      } catch (err: any) {
        return {
          passed: false,
          message: `Ошибка в regex: ${err.message}`,
        };
      }
    }

    // 4. HTML селектор / тег (parse5 AST с поддержкой вложенности и нескольких классов)
    if (criterion.selector !== undefined) {
      const { ast } = parseHtmlTree(code);
      if (!ast) {
        return { passed: false, message: 'Ошибка разметки HTML' };
      }
      const rawSel = criterion.selector.trim();
      let matched = queryHtmlSelector(ast, rawSel);

      if (criterion.hasAttribute) {
        matched = matched.filter((el) =>
          el.attrs?.some(
            (a: any) =>
              a.name === criterion.hasAttribute?.name &&
              (criterion.hasAttribute?.value === undefined || a.value === criterion.hasAttribute?.value)
          )
        );
      }

      if (matched.length === 0) {
        return {
          passed: false,
          message: criterion.message || `Элемент "${criterion.selector}" не найден в HTML`,
        };
      }

      if (criterion.hasText) {
        const text = getHtmlNodeText(matched[0]).trim();
        if (!text) {
          return {
            passed: false,
            message: criterion.message || `Элемент "${criterion.selector}" должен содержать текст`,
            line: matched[0].sourceCodeLocation?.startLine,
          };
        }
      }

      return {
        passed: true,
        message: criterion.message || `Элемент "${criterion.selector}" найден`,
        line: matched[0].sourceCodeLocation?.startLine,
      };
    }

    // 5. CSS селектор и свойства (css-tree)
    if (criterion.cssSelector !== undefined || criterion.cssProperty !== undefined) {
      const { ast } = parseCssTree(code);
      if (!ast) {
        return { passed: false, message: 'Синтаксическая ошибка в CSS' };
      }
      if (criterion.cssSelector) {
        const rules = queryCssRules(ast, criterion.cssSelector);
        if (rules.length === 0) {
          return {
            passed: false,
            message: criterion.message || `CSS правило для "${criterion.cssSelector}" не найдено`,
          };
        }
        if (criterion.cssProperty) {
          const propName = criterion.cssProperty.toLowerCase();
          const ruleWithProp = rules.find((r) => getCssProperty(r, propName) !== undefined);
          if (!ruleWithProp) {
            return {
              passed: false,
              message: criterion.message || `Свойство "${criterion.cssProperty}" отсутствует в "${criterion.cssSelector}"`,
              line: rules[0].loc?.start?.line,
            };
          }
          const decl = getCssProperty(ruleWithProp, propName);
          return validateCssPropertyValue(decl, ruleWithProp, propName, criterion);
        }
        return {
          passed: true,
          message: criterion.message || `CSS правило "${criterion.cssSelector}" подтверждено`,
          line: rules[0].loc?.start?.line,
        };
      }
    }

    // 6. JS переменная (Acorn)
    if (criterion.variableDeclared !== undefined) {
      const { ast } = parseJsTree(code);
      if (!ast) {
        return { passed: false, message: 'Синтаксическая ошибка в JavaScript' };
      }
      let foundLine: number | undefined;
      walkJsAst(ast, (node) => {
        if (node.type === 'VariableDeclarator' && node.id?.name === criterion.variableDeclared) {
          foundLine = node.loc?.start?.line;
          return true;
        }
      });
      if (foundLine === undefined) {
        return {
          passed: false,
          message: criterion.message || `Переменная "${criterion.variableDeclared}" не объявлена`,
        };
      }
      return {
        passed: true,
        message: criterion.message || `Переменная "${criterion.variableDeclared}" найдена`,
        line: foundLine,
      };
    }

    // 7. Пользовательское выражение JS
    if (criterion.expression !== undefined) {
      try {
        const fn = new Function('code', 'files', `return (${criterion.expression});`);
        const res = fn(code, files);
        if (typeof res === 'boolean') {
          return {
            passed: res,
            message: res ? 'Условие выполнено' : (criterion.message || 'Условие не выполнено'),
          };
        }
        if (res && typeof res === 'object') {
          return {
            passed: Boolean(res.passed),
            message: res.message || (res.passed ? 'Условие выполнено' : 'Условие не выполнено'),
            line: res.line,
            column: res.column,
          };
        }
      } catch (err: any) {
        return { passed: false, message: `Ошибка проверки: ${err.message}` };
      }
    }

    // Fallback: проверка непустого кода
    return {
      passed: code.trim().length > 0,
      message: code.trim().length > 0 ? 'Код присутствует' : 'Файл пуст',
    };
  };
}

// -----------------------------------------------------------------------------
// Синхронизация SoloLearn задач из Виртуальной Файловой Системы (task.json)
// -----------------------------------------------------------------------------

export const VFS_TASK_FILENAMES = ['task.json', 'tasks.json', 'sololearn.json'];

export function isVfsTaskFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === 'task.json' ||
    lower === 'tasks.json' ||
    lower === 'sololearn.json' ||
    lower.endsWith('.task.json') ||
    lower.endsWith('.sololearn.json')
  );
}

export function parseTasksFromVfs(files: VirtualFile[]): {
  tasks: LearningTask[];
  sourceFileName?: string;
  parseError?: string;
} | null {
  const taskFile = files.find((f) => isVfsTaskFile(f.name));
  if (!taskFile) return null;

  const raw = taskFile.content.trim();
  if (!raw) {
    return {
      tasks: [],
      sourceFileName: taskFile.name,
      parseError: 'Файл задания пуст. Добавьте конфигурацию урока.',
    };
  }

  try {
    const parsed = JSON.parse(raw);
    let rawList: any[] = [];

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && Array.isArray(parsed.tasks)) {
      rawList = parsed.tasks;
    } else if (parsed && (parsed.id || parsed.title)) {
      rawList = [parsed];
    } else {
      return {
        tasks: [],
        sourceFileName: taskFile.name,
        parseError: 'Формат task.json должен содержать массив задач или объект с полем "tasks".',
      };
    }

    const tasks: LearningTask[] = rawList.map((item, idx) => {
      const id = String(item.id || `vfs-task-${idx + 1}`);
      const title = String(item.title || `Урок ${idx + 1}`);
      const category = (['HTML', 'CSS', 'JavaScript', 'Custom'].includes(item.category)
        ? item.category
        : 'Custom') as LearningTask['category'];
      const targetFile = String(item.targetFile || 'index.html');
      const description = String(item.description || 'Выполните задание');
      const templateCode = typeof item.templateCode === 'string' ? item.templateCode : undefined;
      const slots = item.slots && typeof item.slots === 'object' ? item.slots : undefined;

      const rawCriteria = Array.isArray(item.criteria) ? item.criteria : [];
      const criteria: TaskCriterion[] = rawCriteria.map((c: any, cIdx: number) => ({
        id: String(c.id || `criterion-${cIdx + 1}`),
        description: String(c.description || `Требование ${cIdx + 1}`),
        contains: c.contains,
        notContains: c.notContains,
        regex: c.regex,
        regexFlags: c.regexFlags,
        selector: c.selector,
        hasText: c.hasText,
        hasAttribute: c.hasAttribute,
        cssSelector: c.cssSelector,
        cssProperty: c.cssProperty,
        cssValue: c.cssValue,
        cssValues: Array.isArray(c.cssValues) ? c.cssValues : undefined,
        cssValueRegex: typeof c.cssValueRegex === "string" ? c.cssValueRegex : undefined,
        variableDeclared: c.variableDeclared,
        expression: c.expression,
        message: c.message,
      }));

      if (criteria.length === 0) {
        criteria.push({
          id: `${id}-default-check`,
          description: 'Код в целевом файле написан и не пуст',
          expression: 'code.trim().length > 0',
        });
      }

      return {
        id,
        title,
        category,
        targetFile,
        description,
        templateCode,
        slots,
        criteria,
        isFromVfs: true,
        sourceFile: taskFile.name,
      };
    });

    return {
      tasks,
      sourceFileName: taskFile.name,
    };
  } catch (err: any) {
    return {
      tasks: [],
      sourceFileName: taskFile.name,
      parseError: `Синтаксическая ошибка JSON в ${taskFile.name}: ${err.message}`,
    };
  }
}

export const DEFAULT_SOLOLEARN_TEMPLATE_JSON = JSON.stringify(
  {
    tasks: [
      {
        id: 'vfs-task-1',
        title: 'Урок 1: Карточка и кнопка (HTML)',
        category: 'HTML',
        targetFile: 'index.html',
        description: 'Добавьте заголовок первого уровня <h1> с текстом и кнопку действия с id="btnClick" и классом "btn-primary".',
        templateCode: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Мой проект</title>
</head>
<body>
  <div class="card">
    <[[slot:headerTag]]>
      <h1>[[slot:titleText]]</h1>
    </[[slot:headerTag]]>
    <button id="[[slot:buttonId]]" class="[[slot:buttonClass]]">Кликнуть</button>
  </div>
</body>
</html>`,
        slots: {
          headerTag: {
            id: 'headerTag',
            type: 'select',
            options: ['header', 'div', 'section'],
            correctAnswer: 'header',
            placeholder: 'Тег контейнера'
          },
          titleText: {
            id: 'titleText',
            type: 'input',
            placeholder: 'Название проекта',
            correctAnswer: 'Песочница проекта'
          },
          buttonId: {
            id: 'buttonId',
            type: 'chips',
            options: ['btnClick', 'btnSubmit', 'btnAction'],
            correctAnswer: 'btnClick'
          },
          buttonClass: {
            id: 'buttonClass',
            type: 'chips',
            options: ['btn-primary', 'btn-default', 'btn-ghost'],
            correctAnswer: 'btn-primary'
          }
        },
        criteria: [
          {
            id: 'html-h1-check',
            description: 'В разметке присутствует заголовок <h1> с текстом',
            selector: 'h1',
            hasText: true
          },
          {
            id: 'html-btn-id',
            description: 'Кнопка содержит id="btnClick"',
            contains: 'id="btnClick"'
          },
          {
            id: 'html-btn-class',
            description: 'Кнопка содержит class="btn-primary"',
            contains: 'btn-primary'
          }
        ]
      }
    ]
  },
  null,
  2
);

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
  } else if (task.targetFile.endsWith('.jsx') || task.targetFile.endsWith('.tsx')) {
    parserName = 'JSX / Template';
    syntaxValid = true;
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
      const checkFn = compileCriterionCheck(criterion);
      const res = checkFn(content, files);
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
