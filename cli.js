#!/usr/bin/env node
/**
 * debug-log CLI viewer
 * npx debug-log view <file> [options]
 * npx debug-log stats <file>
 * npx debug-log search <file> --query <text>
 */

import fs from 'fs';
import readline from 'readline';
import { EOL } from 'os';

// ─── ANSI ─────────────────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  green:   '\x1b[32m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
  bgRed:   '\x1b[41m',
  bgYellow:'\x1b[43m',
};

const isTTY = process.stdout.isTTY;
function c(code, text) { return isTTY ? `${code}${text}${C.reset}` : text; }

// ─── Level styling ────────────────────────────────────────────────────────────
const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 };

function levelColor(lvl) {
  switch (lvl) {
    case 'debug': return C.gray;
    case 'info':  return C.green;
    case 'warn':  return C.yellow;
    case 'error': return C.red;
    case 'fatal': return C.bgRed + C.white;
    default:      return C.white;
  }
}

function levelBadge(lvl) {
  const label = (lvl || 'info').toUpperCase().padEnd(5);
  return c(levelColor(lvl), label);
}

// Namespace color cycling
const NS_COLORS = [C.cyan, C.magenta, C.blue, C.green, C.yellow];
const nsColorMap = new Map();
let nsIdx = 0;
function nsColor(ns) {
  if (!nsColorMap.has(ns)) { nsColorMap.set(ns, NS_COLORS[nsIdx++ % NS_COLORS.length]); }
  return nsColorMap.get(ns);
}

// ─── Time formatting ──────────────────────────────────────────────────────────
function fmtTime(isoStr) {
  try {
    const d = new Date(isoStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  } catch { return isoStr || '??:??:??'; }
}

function parseSince(str) {
  // Parse "10 minutes ago", "1 hour ago", "30 seconds ago"
  if (!str) return null;
  const lower = str.toLowerCase().replace(' ago', '').trim();
  const match = lower.match(/^(\d+)\s*(second|minute|hour|day)s?$/);
  if (!match) return null;
  const [, num, unit] = match;
  const ms = { second: 1000, minute: 60000, hour: 3600000, day: 86400000 };
  return Date.now() - parseInt(num) * ms[unit];
}

// ─── NDJSON parser ────────────────────────────────────────────────────────────
function parseLine(raw) {
  try {
    return JSON.parse(raw.trim());
  } catch { return null; }
}

// ─── Pretty render ────────────────────────────────────────────────────────────
function renderEntry(entry) {
  const {
    time, level, namespace, message,
    levelNum, ...rest
  } = entry;

  const ts  = c(C.gray, `[${fmtTime(time)}]`);
  const lvl = levelBadge(level);
  const ns  = c(nsColor(namespace) + C.bold, (namespace || 'app').padEnd(14));
  const msg = c(C.white, message || '');

  // Extra fields
  const skip = new Set(['time', 'level', 'levelNum', 'namespace', 'message']);
  const fields = Object.entries(rest)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => {
      const val = typeof v === 'string' && v.includes(' ') ? `"${v}"` : String(v);
      return c(C.dim, k) + '=' + c(C.cyan, val);
    })
    .join('  ');

  return `${ts} ${lvl}  ${ns}  ${msg}${fields ? '  ' + fields : ''}`;
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function makeFilter({ level, namespace, since, query }) {
  const minLevel   = level     ? (LEVEL_ORDER[level.toLowerCase()] ?? 0) : 0;
  const sinceTs    = since     ? parseSince(since) : null;
  const nsPattern  = namespace ? namespace.toLowerCase() : null;
  const qLower     = query     ? query.toLowerCase() : null;

  return function matches(entry) {
    if (!entry || typeof entry !== 'object') return false;
    const entryLevel = LEVEL_ORDER[entry.level] ?? 0;
    if (entryLevel < minLevel) return false;
    if (nsPattern) {
      const entryNs = (entry.namespace || '').toLowerCase();
      if (!entryNs.startsWith(nsPattern) && entryNs !== nsPattern) return false;
    }
    if (sinceTs) {
      const entryTs = entry.time ? new Date(entry.time).getTime() : 0;
      if (entryTs < sinceTs) return false;
    }
    if (qLower) {
      const text = JSON.stringify(entry).toLowerCase();
      if (!text.includes(qLower)) return false;
    }
    return true;
  };
}

// ─── Commands ─────────────────────────────────────────────────────────────────

// view — pretty print with optional --follow
async function cmdView(file, opts) {
  if (!fs.existsSync(file)) {
    process.stderr.write(`error: file not found: ${file}${EOL}`);
    process.exit(1);
  }

  const filter = makeFilter(opts);

  // Print existing lines
  await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity,
    });
    rl.on('line', raw => {
      if (!raw.trim()) return;
      const entry = parseLine(raw);
      if (entry && filter(entry)) {
        process.stdout.write(renderEntry(entry) + EOL);
      }
    });
    rl.on('close', resolve);
    rl.on('error', reject);
  });

  if (!opts.follow) return;

  // --follow mode: watch for new appended lines
  process.stdout.write(c(C.gray, `\n--- following ${file} (Ctrl+C to stop) ---`) + EOL);
  let fileSize = fs.statSync(file).size;

  fs.watch(file, (eventType) => {
    if (eventType !== 'change') return;
    const newSize = fs.statSync(file).size;
    if (newSize <= fileSize) return;
    const chunk = Buffer.alloc(newSize - fileSize);
    const fd = fs.openSync(file, 'r');
    fs.readSync(fd, chunk, 0, chunk.length, fileSize);
    fs.closeSync(fd);
    fileSize = newSize;

    chunk.toString('utf8').split('\n').forEach(raw => {
      if (!raw.trim()) return;
      const entry = parseLine(raw);
      if (entry && filter(entry)) {
        process.stdout.write(renderEntry(entry) + EOL);
      }
    });
  });
}

// stats — aggregate statistics
async function cmdStats(file) {
  if (!fs.existsSync(file)) {
    process.stderr.write(`error: file not found: ${file}${EOL}`);
    process.exit(1);
  }

  const levelCounts   = {};
  const namespaceCounts = {};
  const hourCounts    = {};
  let total = 0;
  let earliest = Infinity;
  let latest   = -Infinity;

  await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity,
    });
    rl.on('line', raw => {
      if (!raw.trim()) return;
      const entry = parseLine(raw);
      if (!entry) return;
      total++;

      const lvl = entry.level || 'unknown';
      levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;

      const ns = entry.namespace || 'unknown';
      namespaceCounts[ns] = (namespaceCounts[ns] || 0) + 1;

      if (entry.time) {
        const d = new Date(entry.time);
        const ts = d.getTime();
        if (ts < earliest) earliest = ts;
        if (ts > latest)   latest   = ts;
        const hr = d.getHours();
        hourCounts[hr] = (hourCounts[hr] || 0) + 1;
      }
    });
    rl.on('close', resolve);
    rl.on('error', reject);
  });

  const errors   = levelCounts['error'] || 0;
  const warnings = levelCounts['warn']  || 0;
  const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0.0';

  const span = (earliest === Infinity || latest === -Infinity)
    ? 'n/a'
    : `${new Date(earliest).toISOString()} → ${new Date(latest).toISOString()}`;

  const busiestHr = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const topNs = Object.entries(namespaceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const out = (s) => process.stdout.write(s + EOL);

  out('');
  out(c(C.bold + C.cyan, '── Log Statistics ───────────────────────────────────'));
  out(`  File:        ${file}`);
  out(`  Time range:  ${span}`);
  out(`  Total logs:  ${c(C.white + C.bold, String(total))}`);
  out('');
  out(c(C.bold, '  Levels:'));
  for (const [lvl, count] of Object.entries(levelCounts).sort((a, b) => (LEVEL_ORDER[a[0]] || 0) - (LEVEL_ORDER[b[0]] || 0))) {
    const bar = '█'.repeat(Math.max(1, Math.round((count / total) * 20)));
    out(`    ${levelBadge(lvl)}  ${c(levelColor(lvl), bar)} ${count}`);
  }
  out('');
  out(`  Error rate:  ${c(errors > 0 ? C.red : C.green, errorRate + '%')}  (${errors} errors, ${warnings} warnings)`);
  out('');
  out(c(C.bold, '  Top namespaces:'));
  for (const [ns, count] of topNs) {
    out(`    ${c(nsColor(ns), ns.padEnd(20))}  ${count}`);
  }
  out('');
  if (busiestHr) {
    out(`  Busiest hour:  ${String(busiestHr[0]).padStart(2, '0')}:00  (${busiestHr[1]} entries)`);
  }
  out(c(C.gray, '─────────────────────────────────────────────────────'));
  out('');
}

// search — text search
async function cmdSearch(file, query) {
  if (!fs.existsSync(file)) {
    process.stderr.write(`error: file not found: ${file}${EOL}`);
    process.exit(1);
  }
  if (!query) {
    process.stderr.write(`error: --query is required${EOL}`);
    process.exit(1);
  }
  const filter = makeFilter({ query });
  let count = 0;
  await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity,
    });
    rl.on('line', raw => {
      if (!raw.trim()) return;
      const entry = parseLine(raw);
      if (entry && filter(entry)) {
        process.stdout.write(renderEntry(entry) + EOL);
        count++;
      }
    });
    rl.on('close', resolve);
    rl.on('error', reject);
  });
  process.stdout.write(c(C.gray, `\n${count} result${count !== 1 ? 's' : ''} for "${query}"`) + EOL);
}

// ─── Argument parser ─────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const [command, file] = args;
  const opts = {};
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === '--follow' || a === '-f') { opts.follow = true; }
    else if (a === '--level'     && args[i + 1]) { opts.level     = args[++i]; }
    else if (a === '--namespace' && args[i + 1]) { opts.namespace = args[++i]; }
    else if (a === '--since'     && args[i + 1]) { opts.since     = args[++i]; }
    else if (a === '--query'     && args[i + 1]) { opts.query     = args[++i]; }
    else if (a === '-l'          && args[i + 1]) { opts.level     = args[++i]; }
    else if (a === '-n'          && args[i + 1]) { opts.namespace = args[++i]; }
    else if (a === '-q'          && args[i + 1]) { opts.query     = args[++i]; }
  }
  return { command, file, opts };
}

function printHelp() {
  const out = (s) => process.stdout.write(s + EOL);
  out('');
  out(c(C.bold + C.cyan, 'debug-log / dlog — structured log viewer'));
  out('');
  out(c(C.bold, 'Usage:'));
  out('  debug-log <command> <file.log> [options]');
  out('');
  out(c(C.bold, 'Commands:'));
  out('  view <file>    Pretty-print a JSON log file');
  out('  stats <file>   Show log statistics (error rate, top namespaces, busiest hour)');
  out('  search <file>  Search log entries');
  out('');
  out(c(C.bold, 'Options (view / search):'));
  out('  --follow, -f              Tail the file for new entries');
  out('  --level, -l  <level>      Filter: debug | info | warn | error | fatal');
  out('  --namespace, -n <ns>      Filter by namespace prefix');
  out('  --since <duration>        Filter: "10 minutes ago", "1 hour ago"');
  out('  --query, -q <text>        Search log text (search command)');
  out('');
  out(c(C.bold, 'Examples:'));
  out('  dlog view app.log');
  out('  dlog view app.log --follow');
  out('  dlog view app.log --level warn');
  out('  dlog view app.log --namespace myapp:api --since "10 minutes ago"');
  out('  dlog stats app.log');
  out('  dlog search app.log --query "timeout"');
  out('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const { command, file, opts } = parseArgs(process.argv);

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    process.exit(0);
  }

  if (!file && command !== 'help') {
    process.stderr.write(`error: missing file argument${EOL}`);
    printHelp();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'view':   await cmdView(file, opts);         break;
      case 'stats':  await cmdStats(file);              break;
      case 'search': await cmdSearch(file, opts.query); break;
      default:
        process.stderr.write(`error: unknown command '${command}'${EOL}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    process.stderr.write(`fatal: ${err.message}${EOL}`);
    process.exit(1);
  }
})();
