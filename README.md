<div align="center">

# debug-log

**Structured debug logging with namespaces, redaction, and a CLI viewer — zero dependencies.**

[![License: MIT](https://img.shields.io/badge/License-MIT-0B0A09?style=flat&labelColor=0B0A09&color=555)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-0B0A09?style=flat&labelColor=0B0A09&color=brightgreen)](package.json)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-0B0A09?style=flat&labelColor=0B0A09&color=555)](package.json)

</div>

## Install

```bash
npx github:NickCirv/debug-log
```

## Usage

```bash
# View a log file
dlog view app.log

# Tail live with filters
dlog view app.log --follow --level warn --namespace myapp:api

# Stats: error rate, top namespaces, busiest hour
dlog stats app.log

# Text search
dlog search app.log --query "timeout"
```

| Flag | Description |
|------|-------------|
| `--follow, -f` | Tail for new entries |
| `--level, -l <level>` | Filter: `debug` \| `info` \| `warn` \| `error` \| `fatal` |
| `--namespace, -n <ns>` | Filter by namespace prefix |
| `--since <duration>` | Filter: `"10 minutes ago"`, `"1 hour ago"` |
| `--query, -q <text>` | Search log text (search command) |

## What it does

`debug-log` is a Node.js library and CLI for structured logging. The library writes NDJSON logs to file (one JSON object per line) with support for namespaced children, automatic field redaction, timers, and performance marks. The `dlog` CLI reads those files and renders them with colored output, level/namespace/time filters, live-tail mode, and summary stats.

Log output format:

```
[10:42:01] INFO  myapp           Server started            port=3000
[10:42:03] DEBUG myapp:api       Request received          GET /users
[10:42:05] ERROR myapp:db        Connection failed         error="ETIMEDOUT"
```

Library quick-start:

```js
import { createLogger } from 'debug-log';

const log = createLogger('myapp', { redact: ['password', 'token'] });
const api = log.child('api');   // namespace: myapp:api

log.info('Server started', { port: 3000 });
api.error('Request failed', { error: err.message });
```

Environment variable filters:

```bash
DEBUG=myapp:api LOG_LEVEL=warn node server.js
```

---
<sub>Zero dependencies · Node 18+ · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
