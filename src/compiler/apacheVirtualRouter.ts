/**
 * Apache mod_rewrite Virtual Router & Grading Engine
 *
 * Implements in-browser Apache configuration parsing, virtual HTTP request
 * simulation, and declarative assignment grading for students.
 */

export interface VirtualCondition {
  testString: string;
  condPattern: string;
  flags: string[];
  isNegated: boolean;
  isCaseInsensitive: boolean;
  regex?: RegExp;
}

export interface VirtualRoute {
  rawLine: string;
  lineNumber: number;
  pattern: string;
  substitution: string;
  flags: string[];
  isCaseInsensitive: boolean;
  isLast: boolean;
  isQueryStringAppend: boolean;
  isForbidden: boolean;
  isGone: boolean;
  redirectStatus?: number;
  conditions: VirtualCondition[];
}

export interface ParsedApacheConfig {
  rewriteEngine: boolean;
  rewriteBase: string;
  routes: VirtualRoute[];
  directives: Record<string, string[]>;
  errors: string[];
}

export interface VirtualRoutingResult {
  originalUrl: string;
  resolvedPath: string;
  queryString: string;
  fullResolvedUrl: string;
  status: number;
  isRedirect: boolean;
  redirectUrl?: string;
  matchedRulesCount: number;
  trace: string[];
}

export interface VirtualRequestTestCase {
  method?: string;
  url: string;
  expectedPath?: string;
  expectedStatus?: number;
  expectedRedirect?: string;
  description?: string;
}

export interface ApacheGradingDetail {
  testCase: VirtualRequestTestCase;
  passed: boolean;
  actualPath: string;
  actualStatus: number;
  actualFullUrl: string;
  message: string;
  trace: string[];
}

export interface ApacheGradingResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  details: ApacheGradingDetail[];
  routesCount: number;
  errors: string[];
}

/**
 * Parses an Apache configuration text (.htaccess, httpd.conf)
 */
export function parseApacheConfig(configText: string): ParsedApacheConfig {
  const lines = configText.split(/\r?\n/);
  const routes: VirtualRoute[] = [];
  const directives: Record<string, string[]> = {};
  const errors: string[] = [];

  let rewriteEngine = false;
  let rewriteBase = '/';
  let pendingConditions: VirtualCondition[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNumber = idx + 1;
    const line = lines[idx].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue;
    }

    // Ignore Apache block tags (<VirtualHost>, </VirtualHost>, <IfModule>, etc.)
    if (line.startsWith('<') && line.endsWith('>')) {
      continue;
    }

    // Tokenize line respecting quotes
    const tokens = tokenizeApacheLine(line);
    if (tokens.length === 0) continue;

    const directiveName = tokens[0].toLowerCase();

    // Store directive for criteria checks
    if (!directives[directiveName]) {
      directives[directiveName] = [];
    }
    directives[directiveName].push(line);

    if (directiveName === 'rewriteengine') {
      const state = tokens[1]?.toLowerCase();
      rewriteEngine = state === 'on' || state === '1' || state === 'true';
    } else if (directiveName === 'rewritebase') {
      rewriteBase = tokens[1] || '/';
      if (!rewriteBase.startsWith('/')) rewriteBase = '/' + rewriteBase;
      if (!rewriteBase.endsWith('/')) rewriteBase = rewriteBase + '/';
    } else if (directiveName === 'rewritecond') {
      if (tokens.length < 3) {
        errors.push(`Строка ${lineNumber}: RewriteCond требует минимум 2 аргумента (TestString CondPattern)`);
        continue;
      }
      const testString = tokens[1];
      const condPattern = tokens[2];
      const flagsToken = tokens[3] || '';
      const flags = parseFlags(flagsToken);

      const isNegated = condPattern.startsWith('!');
      const cleanPattern = isNegated ? condPattern.slice(1) : condPattern;
      const isCaseInsensitive = flags.some((f) => f.toUpperCase() === 'NC');

      let regex: RegExp | undefined;
      if (!cleanPattern.startsWith('-f') && !cleanPattern.startsWith('-d')) {
        try {
          regex = new RegExp(cleanPattern, isCaseInsensitive ? 'i' : '');
        } catch {
          // Keep undefined if custom condition
        }
      }

      pendingConditions.push({
        testString,
        condPattern,
        flags,
        isNegated,
        isCaseInsensitive,
        regex,
      });
    } else if (directiveName === 'rewriterule') {
      if (tokens.length < 3) {
        errors.push(`Строка ${lineNumber}: RewriteRule требует минимум 2 аргумента (Pattern Substitution)`);
        continue;
      }

      const pattern = tokens[1];
      const substitution = tokens[2];
      const flagsToken = tokens[3] || '';
      const flags = parseFlags(flagsToken);

      const isCaseInsensitive = flags.some((f) => f.toUpperCase() === 'NC');
      const isLast = flags.some((f) => f.toUpperCase() === 'L' || f.toUpperCase() === 'LAST');
      const isQueryStringAppend = flags.some(
        (f) => f.toUpperCase() === 'QSA' || f.toUpperCase() === 'QSAPPEND'
      );
      const isForbidden = flags.some((f) => f.toUpperCase() === 'F' || f.toUpperCase() === 'FORBIDDEN');
      const isGone = flags.some((f) => f.toUpperCase() === 'G' || f.toUpperCase() === 'GONE');

      let redirectStatus: number | undefined;
      const rFlag = flags.find((f) => /^R(?:=(\d+))?$/i.test(f));
      if (rFlag) {
        const match = rFlag.match(/^R(?:=(\d+))?$/i);
        redirectStatus = match && match[1] ? parseInt(match[1], 10) : 302;
      }

      routes.push({
        rawLine: line,
        lineNumber,
        pattern,
        substitution,
        flags,
        isCaseInsensitive,
        isLast,
        isQueryStringAppend,
        isForbidden,
        isGone,
        redirectStatus,
        conditions: [...pendingConditions],
      });

      // Clear conditions for next rule
      pendingConditions = [];
    }
  }

  return {
    rewriteEngine,
    rewriteBase,
    routes,
    directives,
    errors,
  };
}

/**
 * Tokenizes a line respecting single/double quotes and flag brackets
 */
function tokenizeApacheLine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let inBracket = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (!inQuotes && (ch === '"' || ch === "'")) {
      inQuotes = true;
      quoteChar = ch;
    } else if (inQuotes && ch === quoteChar) {
      inQuotes = false;
      quoteChar = '';
    } else if (!inQuotes && ch === '[') {
      inBracket = true;
      current += ch;
    } else if (!inQuotes && inBracket && ch === ']') {
      inBracket = false;
      current += ch;
    } else if (!inQuotes && !inBracket && /\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parses flags like "[L,QSA,NC,R=301]" or "L,QSA"
 */
function parseFlags(rawFlags: string): string[] {
  let clean = rawFlags.trim();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1);
  }
  if (!clean) return [];
  return clean.split(',').map((f) => f.trim()).filter(Boolean);
}

/**
 * Simulates a virtual HTTP request through the parsed Apache rules
 */
export function simulateApacheRequest(
  configOrRoutes: ParsedApacheConfig | VirtualRoute[],
  requestUrl: string,
  options?: {
    files?: string[];
    directories?: string[];
    host?: string;
  }
): VirtualRoutingResult {
  const routes: VirtualRoute[] = Array.isArray(configOrRoutes)
    ? configOrRoutes
    : configOrRoutes.routes;

  const trace: string[] = [];
  trace.push(`[VirtualRequest] Получен запрос: ${requestUrl}`);

  // Parse incoming request into path and query
  let normalizedUrl = requestUrl.trim();
  if (!normalizedUrl.startsWith('/') && !normalizedUrl.startsWith('http')) {
    normalizedUrl = '/' + normalizedUrl;
  }

  let pathPart = '';
  let queryPart = '';

  try {
    const dummyBase = 'http://localhost';
    const parsedObj = new URL(normalizedUrl, dummyBase);
    pathPart = parsedObj.pathname;
    queryPart = parsedObj.search ? parsedObj.search.slice(1) : '';
  } catch {
    const qIdx = normalizedUrl.indexOf('?');
    if (qIdx !== -1) {
      pathPart = normalizedUrl.slice(0, qIdx);
      queryPart = normalizedUrl.slice(qIdx + 1);
    } else {
      pathPart = normalizedUrl;
      queryPart = '';
    }
  }

  let currentPath = pathPart;
  let currentQuery = queryPart;
  let status = 200;
  let isRedirect = false;
  let redirectUrl: string | undefined;
  let matchedRulesCount = 0;

  for (let idx = 0; idx < routes.length; idx++) {
    const route = routes[idx];
    trace.push(`[Rule ${idx + 1}] Проверка правила: ${route.rawLine}`);

    // In .htaccess context, Apache strips the leading slash from the target path before matching
    const relPath = currentPath.startsWith('/') ? currentPath.slice(1) : currentPath;

    // Build regex for rule
    let regex: RegExp;
    try {
      regex = new RegExp(route.pattern, route.isCaseInsensitive ? 'i' : '');
    } catch (e: any) {
      trace.push(`[Rule ${idx + 1}] Ошибка синтаксиса регулярного выражения "${route.pattern}": ${e.message}`);
      continue;
    }

    // Try matching both relPath (standard .htaccess) and currentPath (server config context)
    let match = regex.exec(relPath);
    let matchedInput = relPath;
    if (!match && currentPath.startsWith('/')) {
      match = regex.exec(currentPath);
      if (match) matchedInput = currentPath;
    }

    if (!match) {
      trace.push(`[Rule ${idx + 1}] Шаблон "${route.pattern}" не совпал с путем "${relPath}"`);
      continue;
    }

    // Check conditions (RewriteCond)
    let conditionsPassed = true;
    for (const cond of route.conditions) {
      let testVal = cond.testString;
      // Evaluate common Apache server variables
      if (testVal === '%{REQUEST_URI}') {
        testVal = currentPath;
      } else if (testVal === '%{QUERY_STRING}') {
        testVal = currentQuery;
      } else if (testVal === '%{HTTP_HOST}') {
        testVal = options?.host || 'localhost';
      } else if (testVal === '%{REQUEST_FILENAME}') {
        testVal = currentPath;
      }

      if (cond.condPattern === '-f' || cond.condPattern === '!-f') {
        const fileExists = (options?.files || []).some(
          (f) => f.toLowerCase() === relPath.toLowerCase() || f.toLowerCase() === currentPath.toLowerCase()
        );
        const condOk = cond.condPattern === '-f' ? fileExists : !fileExists;
        if (!condOk) {
          conditionsPassed = false;
          trace.push(`[Rule ${idx + 1}] Условие RewriteCond ${cond.testString} ${cond.condPattern} не выполнено`);
          break;
        }
      } else if (cond.condPattern === '-d' || cond.condPattern === '!-d') {
        const dirExists = (options?.directories || []).some(
          (d) => d.toLowerCase() === relPath.toLowerCase() || d.toLowerCase() === currentPath.toLowerCase()
        );
        const condOk = cond.condPattern === '-d' ? dirExists : !dirExists;
        if (!condOk) {
          conditionsPassed = false;
          trace.push(`[Rule ${idx + 1}] Условие RewriteCond ${cond.testString} ${cond.condPattern} не выполнено`);
          break;
        }
      } else if (cond.regex) {
        const condMatch = cond.regex.test(testVal);
        const condOk = cond.isNegated ? !condMatch : condMatch;
        if (!condOk) {
          conditionsPassed = false;
          trace.push(`[Rule ${idx + 1}] Условие RewriteCond ${cond.testString} ${cond.condPattern} не совпало`);
          break;
        }
      }
    }

    if (!conditionsPassed) {
      continue;
    }

    // Rule matched!
    matchedRulesCount++;
    trace.push(`[Rule ${idx + 1}] УСПЕШНО совпало с "${matchedInput}". Выполняется подстановка.`);

    // Perform backreference substitution ($1..$9 and \1..\9)
    let substituted = route.substitution;

    // Special dash '-' substitution means "no substitution, only flags / pass-through"
    if (substituted !== '-') {
      for (let g = 1; g < match.length; g++) {
        const val = match[g] !== undefined ? match[g] : '';
        substituted = substituted.split(`$${g}`).join(val);
        substituted = substituted.split(`\\${g}`).join(val);
      }
      // Replace $0 / \0 with full match
      substituted = substituted.split('$0').join(match[0] || '');
      substituted = substituted.split('\\0').join(match[0] || '');

      // Separate substituted path and query
      const subQIdx = substituted.indexOf('?');
      if (subQIdx !== -1) {
        const subPath = substituted.slice(0, subQIdx);
        const subQuery = substituted.slice(subQIdx + 1);

        currentPath = subPath;
        if (route.isQueryStringAppend && currentQuery) {
          currentQuery = subQuery ? `${subQuery}&${currentQuery}` : currentQuery;
        } else {
          currentQuery = subQuery;
        }
      } else {
        currentPath = substituted;
      }
    }

    // Handle flags
    if (route.isForbidden) {
      status = 403;
      trace.push(`[Rule ${idx + 1}] Флаг [F]: установлен статус 403 Forbidden`);
    } else if (route.isGone) {
      status = 410;
      trace.push(`[Rule ${idx + 1}] Флаг [G]: установлен статус 410 Gone`);
    } else if (route.redirectStatus) {
      status = route.redirectStatus;
      isRedirect = true;
      redirectUrl = currentPath + (currentQuery ? `?${currentQuery}` : '');
      trace.push(`[Rule ${idx + 1}] Флаг [R=${status}]: редирект на ${redirectUrl}`);
    }

    trace.push(
      `[Rule ${idx + 1}] Промежуточный результат: путь="${currentPath}", query="${currentQuery}"`
    );

    if (route.isLast) {
      trace.push(`[Rule ${idx + 1}] Флаг [L]: завершение обработки правил RewriteRule.`);
      break;
    }
  }

  // Normalize final resolved path
  const fullResolvedUrl = currentQuery ? `${currentPath}?${currentQuery}` : currentPath;

  trace.push(`[VirtualRequest] Итог: ${fullResolvedUrl} (Статус: ${status})`);

  return {
    originalUrl: requestUrl,
    resolvedPath: currentPath,
    queryString: currentQuery,
    fullResolvedUrl,
    status,
    isRedirect,
    redirectUrl,
    matchedRulesCount,
    trace,
  };
}

/**
 * Grades student's Apache configuration against declarative test cases
 */
export function gradeApacheRoutingTask(
  configText: string,
  testCases: VirtualRequestTestCase[],
  options?: {
    files?: string[];
    directories?: string[];
  }
): ApacheGradingResult {
  const parsed = parseApacheConfig(configText);
  const details: ApacheGradingDetail[] = [];
  let passedTests = 0;

  for (const tc of testCases) {
    const simResult = simulateApacheRequest(parsed, tc.url, options);

    let passed = true;
    const failures: string[] = [];

    // Verify expected path / url
    if (tc.expectedPath !== undefined) {
      const normExpected = normalizeUrlForComparison(tc.expectedPath);
      const normActualPath = normalizeUrlForComparison(simResult.resolvedPath);
      const normActualFull = normalizeUrlForComparison(simResult.fullResolvedUrl);

      const pathMatches =
        normActualPath === normExpected ||
        normActualFull === normExpected ||
        simResult.fullResolvedUrl === tc.expectedPath ||
        simResult.resolvedPath === tc.expectedPath;

      if (!pathMatches) {
        passed = false;
        failures.push(
          `Ожидался путь "${tc.expectedPath}", но получен "${simResult.fullResolvedUrl}"`
        );
      }
    }

    // Verify expected status
    if (tc.expectedStatus !== undefined && simResult.status !== tc.expectedStatus) {
      passed = false;
      failures.push(
        `Ожидался HTTP статус ${tc.expectedStatus}, но получен ${simResult.status}`
      );
    }

    // Verify expected redirect
    if (tc.expectedRedirect !== undefined) {
      const normExpRedirect = normalizeUrlForComparison(tc.expectedRedirect);
      const normActRedirect = normalizeUrlForComparison(simResult.redirectUrl || '');
      if (normExpRedirect !== normActRedirect) {
        passed = false;
        failures.push(
          `Ожидался редирект на "${tc.expectedRedirect}", но получен "${simResult.redirectUrl || 'нет редиректа'}"`
        );
      }
    }

    if (passed) {
      passedTests++;
    }

    const message = passed
      ? (tc.description || `Запрос "${tc.url}" успешно разрешен в "${simResult.fullResolvedUrl}"`)
      : failures.join('; ');

    details.push({
      testCase: tc,
      passed,
      actualPath: simResult.resolvedPath,
      actualStatus: simResult.status,
      actualFullUrl: simResult.fullResolvedUrl,
      message,
      trace: simResult.trace,
    });
  }

  return {
    passed: passedTests === testCases.length && testCases.length > 0,
    totalTests: testCases.length,
    passedTests,
    details,
    routesCount: parsed.routes.length,
    errors: parsed.errors,
  };
}

function normalizeUrlForComparison(url: string): string {
  let clean = url.trim();
  if (clean.startsWith('/')) clean = clean.slice(1);

  const qIdx = clean.indexOf('?');
  if (qIdx === -1) {
    return clean;
  }

  const path = clean.slice(0, qIdx);
  const search = clean.slice(qIdx + 1);

  // Sort query parameters so key order doesn't break comparisons
  const params = search.split('&').filter(Boolean).sort().join('&');
  return params ? `${path}?${params}` : path;
}