/**
 * debug-log — Zero-dependency structured debug logging
 * Namespaces, levels, redaction, file transport, pretty/JSON output
 * Node 18+ ES modules, zero external dependencies
 */

import fs from 'fs';
import { performance } from 'perf_hooks';
import { EOL } from 'os';

// ─── ANSI color codes ────────────────────────────────────────────────────────
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgMagenta: '\x1b[45m',
};

// ─── Level definitions ───────────────────────────────────────────────────────
const LEVELS = {
  debug: 10,
  info:  20,
  warn:  30,
  error: 40,
  fatal: 50,
};

const LEVEL_LABELS = {
  10: 'DEBUG',
  20: 'INFO ',
  30: 'WARN ',
  40: 'ERROR',
  50: 'FATAL',
};

const LEVEL_COLORS = {
  10: ANSI.gray,
  20: ANSI.green,
  30: ANSI.yellow,
  40: ANSI.red,
  50: ANSI.bgRed + ANSI.white,
};

// Namespace colors — cycle through a set for visual distinction
const NS_COLORS = [
  ANSI.cyan, ANSI.magenta, ANSI.blue, ANSI.green, ANSI.yellow,
];
const nsColorMap = new Map();
let nsColorIdx = 0;
function nsColor(ns) {
  if (!nsColorMap.has(ns)) {
    nsColorMap.set(ns, NS_COLORS[nsColorIdx % NS_COLORS.length]);
    nsColorIdx++;
  }
  return nsColorMap.get(ns);
}

// ─── Environment flags ───────────────────────────────────────────────────────
function getDebugFilter() {
  const raw = process.env.DEBUG || '';
  if (!raw || raw === '*') return null; // null = allow all
  // Support comma-separated globs: "myapp:*,other"
  return raw.split(',').map(p => p.trim()).filter(Boolean);
}

function getLogLevelThreshold() {
  const raw = (process.env.LOG_LEVEL || 'debug').toLowerCase();
  return LEVELS[raw] ?? LEVELS.debug;
}

function namespaceMatchesFilter(namespace, filter) {
  if (!filter) return true;
  return filter.some(pattern => {
    // Glob: "myapp:*" or exact "myapp:api"
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return namespace.startsWith(prefix) || namespace === prefix.slice(0, -1);
    }
    return namespace === pattern;
  });
}

// ─── Redaction ───────────────────────────────────────────────────────────────
function deepCloneAndRedact(obj, redactKeys) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => deepCloneAndRedact(v, redactKeys));
  const clone = {};
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    const shouldRedact = redactKeys.some(r => keyLower === r.toLowerCase() || keyLower.includes(r.toLowerCase()));
    if (shouldRedact) {
      clone[k] = '[REDACTED]';
    } else if (v !== null && typeof v === 'object') {
      clone[k] = deepCloneAndRedact(v, redactKeys);
    } else {
      clone[k] = v;
    }
  }
  return clone;
}

// ─── Formatting ──────────────────────────────────────────────────────────────
function formatTimePretty() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatISO() {
  return new Date().toISOString();
}

function formatContextFields(ctx) {
  if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return '';
  return Object.entries(ctx)
    .map(([k, v]) => {
      const val = typeof v === 'string' && v.includes(' ') ? `"${v}"` : String(v);
      return `${ANSI.dim}${k}${ANSI.reset}=${ANSI.cyan}${val}${ANSI.reset}`;
    })
    .join('  ');
}

function prettyLine(level, namespace, message, context, groupDepth) {
  const time   = `${ANSI.gray}[${formatTimePretty()}]${ANSI.reset}`;
  const lvl    = `${LEVEL_COLORS[level]}${LEVEL_LABELS[level]}${ANSI.reset}`;
  const ns     = `${nsColor(namespace)}${ANSI.bold}${namespace.padEnd(14)}${ANSI.reset}`;
  const msg    = `${ANSI.white}${message}${ANSI.reset}`;
  const indent = groupDepth > 0 ? '  '.repeat(groupDepth) : '';
  const fields = context ? formatContextFields(context) : '';
  return `${time} ${lvl}  ${indent}${ns}  ${msg}${fields ? '  ' + fields : ''}`;
}

function jsonLine(level, namespace, message, context) {
  const entry = {
    time: formatISO(),
    level: LEVEL_LABELS[level].trim().toLowerCase(),
    levelNum: level,
    namespace,
    message,
    ...(context && typeof context === 'object' ? context : {}),
  };
  return JSON.stringify(entry);
}

function minimalLine(level, namespace, message, context) {
  const fields = context
    ? ' ' + Object.entries(context).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')
    : '';
  return `${LEVEL_LABELS[level]} [${namespace}] ${message}${fields}`;
}

// ─── File transport ───────────────────────────────────────────────────────────
const fileStreams = new Map();
function getFileStream(filePath) {
  if (!fileStreams.has(filePath)) {
    const stream = fs.createWriteStream(filePath, { flags: 'a' });
    fileStreams.set(filePath, stream);
  }
  return fileStreams.get(filePath);
}

// ─── Core Logger ─────────────────────────────────────────────────────────────
class Logger {
  constructor(namespace, options = {}) {
    this.namespace  = namespace;
    this.options    = {
      format:   options.format ?? 'pretty',
      redact:   options.redact ?? [],
      file:     options.file   ?? null,
      ...options,
    };
    // Bound context fields (from child({key: val}))
    this._context   = options._context ?? {};
    this._groupDepth = options._groupDepth ?? 0;
    // Timers
    this._timers    = new Map();
  }

  _shouldLog(level) {
    const filter    = getDebugFilter();
    const threshold = getLogLevelThreshold();
    if (level < threshold) return false;
    if (!namespaceMatchesFilter(this.namespace, filter)) return false;
    return true;
  }

  _write(level, message, context) {
    if (!this._shouldLog(level)) return;

    // Merge bound context with call-site context
    const merged = Object.assign({}, this._context, context ?? {});
    const redacted = this.options.redact.length > 0
      ? deepCloneAndRedact(merged, this.options.redact)
      : merged;
    const emptyCtx = Object.keys(redacted).length === 0 ? null : redacted;

    let line;
    const fmt = this.options.format;
    if (fmt === 'json') {
      line = jsonLine(level, this.namespace, message, emptyCtx);
    } else if (fmt === 'minimal') {
      line = minimalLine(level, this.namespace, message, emptyCtx);
    } else {
      line = prettyLine(level, this.namespace, message, emptyCtx, this._groupDepth);
    }

    process.stdout.write(line + EOL);

    // File transport — always JSON for structured storage
    if (this.options.file) {
      const stream = getFileStream(this.options.file);
      const jsonEntry = jsonLine(level, this.namespace, message, emptyCtx);
      stream.write(jsonEntry + '\n');
    }
  }

  debug(message, context)  { this._write(LEVELS.debug, message, context); }
  info(message, context)   { this._write(LEVELS.info,  message, context); }
  warn(message, context)   { this._write(LEVELS.warn,  message, context); }
  error(message, context)  { this._write(LEVELS.error, message, context); }
  fatal(message, context)  { this._write(LEVELS.fatal, message, context); }

  // ── Timers ─────────────────────────────────────────────────────────────────
  time(label) {
    this._timers.set(label, performance.now());
  }

  timeEnd(label) {
    const start = this._timers.get(label);
    if (start === undefined) {
      this.warn(`timer '${label}' not started`);
      return;
    }
    const elapsed = (performance.now() - start).toFixed(2);
    this._timers.delete(label);
    this.info(`timer: ${label}`, { elapsed_ms: parseFloat(elapsed) });
  }

  // ── Performance mark ───────────────────────────────────────────────────────
  mark(label) {
    const mem = process.memoryUsage();
    this.debug(`mark: ${label}`, {
      heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      rss_mb:       (mem.rss       / 1024 / 1024).toFixed(2),
      ts:           formatISO(),
    });
  }

  // ── Grouping ───────────────────────────────────────────────────────────────
  group(label) {
    this.info(`▶ ${label}`);
    this._groupDepth++;
  }

  groupEnd() {
    if (this._groupDepth > 0) this._groupDepth--;
  }

  // ── Child loggers ──────────────────────────────────────────────────────────
  /**
   * child(name)       — creates a namespaced child: 'myapp' → 'myapp:name'
   * child({ fields }) — creates a context-bound child (same namespace, extra fields)
   */
  child(nameOrContext, contextFields = {}) {
    if (typeof nameOrContext === 'string') {
      // Namespaced child
      return new Logger(`${this.namespace}:${nameOrContext}`, {
        ...this.options,
        _context:    Object.assign({}, this._context, contextFields),
        _groupDepth: this._groupDepth,
      });
    } else if (typeof nameOrContext === 'object' && nameOrContext !== null) {
      // Context-bound child — same namespace, merged fields
      return new Logger(this.namespace, {
        ...this.options,
        _context:    Object.assign({}, this._context, nameOrContext),
        _groupDepth: this._groupDepth,
      });
    }
    throw new TypeError('child() expects a string name or context object');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * createLogger(namespace, options?)
 *
 * Options:
 *   format   - 'pretty' | 'json' | 'minimal'  (default: 'pretty')
 *   redact   - string[]  keys to redact        (default: [])
 *   file     - string    path to JSON log file  (default: null)
 */
export function createLogger(namespace, options = {}) {
  if (!namespace || typeof namespace !== 'string') {
    throw new TypeError('createLogger requires a non-empty string namespace');
  }
  return new Logger(namespace, options);
}

// Default instance for quick usage: import log from 'debug-log'
const log = createLogger('app');
export default log;

// Named re-exports for convenience
export { Logger, LEVELS, LEVEL_LABELS };
