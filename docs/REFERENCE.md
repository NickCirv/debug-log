# debug-log — implementation reference

Source revision: `d7f39a7057383fa14fc54f37bdbee327ce4d9879`. This reference records source declarations; it is not a transcript of a successful run.

## Entrypoint and runtime

[package.json](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/package.json) declares `cli.js`. Node.js `>=20` and npm.

Executable mapping: `debug-log` → `./cli.js`, `dlog` → `./cli.js`.

## Supported workflow

createLogger API; levels and namespace filtering; bound context and timers; configurable formatting/redaction; JSON log viewer.

Redaction only covers configured keys and is not a complete secret detector. Logging can write sensitive context to stdout or an optional JSON file. DEBUG and LOG_LEVEL filters affect emitted messages.

## Command reference

The commands below use the installed executable name. From the pinned checkout, replace it with the `node` entrypoint shown above. Options and command branches were cross-checked against captured source; examples are not execution transcripts.

| Flag | Description |
|------|-------------|
| `--follow, -f` | Tail for new entries |
| `--level, -l <level>` | Filter: `debug` \| `info` \| `warn` \| `error` \| `fatal` |
| `--namespace, -n <ns>` | Filter by namespace prefix |
| `--since <duration>` | Filter: `"10 minutes ago"`, `"1 hour ago"` |
| `--query, -q <text>` | Search log text (search command) |

## Library API

Import from the checkout using `import { createLogger } from './index.js'`. `createLogger(namespace, options)` requires a non-empty string namespace and throws `TypeError` otherwise. The default export is a logger with namespace `app`; named exports also include `Logger`, `LEVELS` and `LEVEL_LABELS`.

| Option | Default | Behavior |
| --- | --- | --- |
| `format` | `pretty` | `pretty`, `json` or `minimal` stdout formatting |
| `redact` | `[]` | Context keys to redact recursively |
| `file` | `null` | Optional append-only JSON log path; stdout still receives output |

| Method | Behavior |
| --- | --- |
| `debug/info/warn/error/fatal(message, context)` | Emit an event if namespace and level filters allow it |
| `child('api', fields)` | New `parent:api` namespace with merged context |
| `child({requestId: 'demo'})` | Same namespace with bound context |
| `time(label)` / `timeEnd(label)` | Start/end an elapsed-time observation; missing timers produce a warning |
| `mark(label)` | Debug-level memory/timestamp observation |
| `group(label)` / `groupEnd()` | Adjust presentation grouping depth |

`DEBUG` filters namespaces; `LOG_LEVEL` selects the minimum level and defaults to `debug`. Redaction applies to context fields, not arbitrary secret text embedded in the message. File output is JSON regardless of stdout format.

## Log-file commands

```sh
node cli.js view app.log --level warn --namespace service --since "10 minutes ago"
node cli.js stats app.log
node cli.js search app.log --query "timeout"
```

`view` supports filtering and `--follow`; `stats` computes a file summary. The current `search` dispatch forwards only `--query`, so do not assume view's namespace/time/level filters also constrain search. Missing files/arguments or command failures exit `1`. These commands inspect logs; they do not verify the truth of logged events.

## Package scripts

| Script | Exact command |
| --- | --- |
| `test` | `node --test` |

## Environment references

The implementation reads `LOG_LEVEL`. Some are optional or mode-specific; inspect their call sites before configuring a service. Credentials and endpoint values are never supplied by this document.

## Implementation sources

[cli.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/cli.js), [index.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/index.js).

## Verification boundary

No repository code, tests, network operation, hook installer or migration was executed for this review. Source inspection supports the documented interface; runtime correctness and external-service compatibility remain unverified.
