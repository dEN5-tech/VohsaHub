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

    // 4. HTML селектор / тег (parse5)
    if (criterion.selector !== undefined) {
      const { ast } = parseHtmlTree(code);
      if (!ast) {
        return { passed: false, message: 'Ошибка разметки HTML' };
      }
      const rawSel = criterion.selector.trim();
      const tagNameMatch = rawSel.match(/^[a-zA-Z0-9_-]+/);
      const targetTag = tagNameMatch ? tagNameMatch[0] : '*';
      const idMatch = rawSel.match(/#([a-zA-Z0-9_-]+)/);
      const classMatch = rawSel.match(/\.([a-zA-Z0-9_-]+)/);

      const allElements = queryHtmlElements(ast, targetTag);
      const matched = allElements.filter((el) => {
        if (idMatch) {
          const hasId = el.attrs?.some((a: any) => a.name === 'id' && a.value === idMatch[1]);
          if (!hasId) return false;
        }
        if (classMatch) {
          const hasCls = el.attrs?.some((a: any) => a.name === 'class' && a.value.includes(classMatch[1]));
          if (!hasCls) return false;
        }
        if (criterion.hasAttribute) {
          const hasAttr = el.attrs?.some(
            (a: any) =>
              a.name === criterion.hasAttribute?.name &&
              (criterion.hasAttribute?.value === undefined || a.value === criterion.hasAttribute?.value)
          );
          if (!hasAttr) return false;
        }
        return true;
      });

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
          const prop = getCssProperty(rules[0], criterion.cssProperty);
          if (!prop) {
            return {
              passed: false,
              message: criterion.message || `Свойство "${criterion.cssProperty}" отсутствует в ${criterion.cssSelector}`,
              line: rules[0].loc?.start?.line,
            };
          }
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
