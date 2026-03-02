# debug-log
> Zero-dependency structured debug logging with namespaces, levels, redaction, and a CLI viewer.

```bash
npm install debug-log
# or use the CLI
npx debug-log view app.log --follow
```

```
[10:42:01] INFO  myapp           Server started            port=3000
[10:42:03] DEBUG myapp:api       Request received          GET /users
[10:42:03] WARN  myapp:api       Rate limit approaching    remaining=10
[10:42:05] ERROR myapp:db        Connection failed         error="ETIMEDOUT"
```

## Library Usage

```js
import { createLogger } from 'debug-log';

const log = createLogger('myapp', {
  redact: ['password', 'token']
});
const api = log.child('api');

log.info('Started', { port: 3000 });
api.error('Failed', { error: err.message });
```

### Namespaced Children

```js
const log = createLogger('myapp');
const apiLog = log.child('api');        // namespace: myapp:api
const dbLog  = log.child('db');         // namespace: myapp:db
```

### Context-Bound Children

```js
// All logs from reqLog include { requestId: 'abc123' }
const reqLog = log.child({ requestId: 'abc123' });
reqLog.info('Processing');              // includes requestId automatically
```

### Timers

```js
log.time('db-query');
await runQuery();
log.timeEnd('db-query');                // logs elapsed_ms
```

### Performance Marks

```js
log.mark('after-init');                 // logs heap_used_mb + rss_mb + ts
```

### Grouping

```js
log.group('Startup sequence');
log.info('Loading config');
log.info('Connecting to DB');
log.groupEnd();
```

### Output Formats

```js
// Pretty (default) — colored terminal output
const log = createLogger('app', { format: 'pretty' });

// JSON — NDJSON, one object per line (great for production)
const log = createLogger('app', { format: 'json' });

// Minimal — plain text, no ANSI
const log = createLogger('app', { format: 'minimal' });
```

### File Transport

```js
// Writes JSON to file AND pretty to stdout simultaneously
const log = createLogger('app', { file: './app.log' });
```

### Redaction

```js
const log = createLogger('app', {
  redact: ['password', 'token', 'secret', 'authorization']
});

log.info('Auth request', { user: 'nick', password: 'hunter2' });
// → password=[REDACTED]
```

### Environment Variables

| Variable | Effect |
|----------|--------|
| `DEBUG=myapp:api` | Only log `myapp:api` namespace (glob: `myapp:*`) |
| `LOG_LEVEL=warn` | Only log warn, error, fatal |
| `DEBUG=*` | Log all namespaces (default) |

```bash
DEBUG=myapp:api node server.js
LOG_LEVEL=warn node server.js
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `dlog view <file>` | View log file with pretty formatting |
| `dlog view <file> --follow` | Tail -f mode |
| `dlog view <file> --level warn` | Filter by level |
| `dlog view <file> --namespace app:api` | Filter by namespace prefix |
| `dlog view <file> --since "10 minutes ago"` | Filter by time |
| `dlog stats <file>` | Log statistics: error rate, top namespaces, busiest hour |
| `dlog search <file> --query text` | Search log text |

### CLI Examples

```bash
# Live tail production logs
dlog view app.log --follow

# Review only errors from the last hour
dlog view app.log --level error --since "1 hour ago"

# Filter to a specific service namespace
dlog view app.log --namespace myapp:payments

# Get an overview of log health
dlog stats app.log

# Search for timeout errors
dlog search app.log --query "timeout"
```

## Install

```bash
npm install debug-log
npx debug-log view <file>
```

## API Reference

### `createLogger(namespace, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | `'pretty' \| 'json' \| 'minimal'` | `'pretty'` | Output format |
| `redact` | `string[]` | `[]` | Keys to redact from log context |
| `file` | `string \| null` | `null` | Path to write JSON log file |

### Logger methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `debug` | `(message, context?)` | Debug level log |
| `info` | `(message, context?)` | Info level log |
| `warn` | `(message, context?)` | Warning level log |
| `error` | `(message, context?)` | Error level log |
| `fatal` | `(message, context?)` | Fatal level log |
| `child` | `(name: string)` | Create namespaced child |
| `child` | `(context: object)` | Create context-bound child |
| `time` | `(label: string)` | Start a named timer |
| `timeEnd` | `(label: string)` | Stop timer, log elapsed ms |
| `mark` | `(label: string)` | Log performance mark + memory |
| `group` | `(label: string)` | Start visual group |
| `groupEnd` | `()` | End visual group |

---

**Zero dependencies** · **Node 18+** · Made by [NickCirv](https://github.com/NickCirv) · MIT
