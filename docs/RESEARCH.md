# debug-log — documentation research

Reviewed 21 September 2026. Public GitHub source only.

## Revision and scope

- Commit: [`d7f39a7057383fa14fc54f37bdbee327ce4d9879`](https://github.com/NickCirv/debug-log/commit/d7f39a7057383fa14fc54f37bdbee327ce4d9879).
- Tree: `9ce6168a99c74f88898ce24af31b6e82b72e678b`; truncated: `false`.
- Capture: 7 of 7 eligible text files; all eligible text files.
- Method: package and entrypoint inspection, implementation-interface review, targeted behavior/limitation inspection, and test-source review. This is not an exhaustive correctness or security audit.
- Commands run against repository code: **none**. External services, deployment and npm publication were not verified.

## Claim and evidence map

| Documentation claim | Pinned evidence | Assessment |
| --- | --- | --- |
| Runtime, executable and development commands | [package.json](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/package.json) | Source declaration inspected; runtime unverified |
| Provides a namespaced JavaScript logger and a CLI for reading structured log files. | [cli.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/cli.js) · [index.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/index.js) | Implementation interfaces inspected; behavior not executed |
| createLogger API; levels and namespace filtering; bound context and timers; configurable formatting/redaction; JSON log viewer. | [cli.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/cli.js), [index.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/index.js) | Source-backed scope, not a test result |
| Redaction only covers configured keys and is not a complete secret detector. Logging can write sensitive context to stdout or an optional JSON file. DEBUG and LOG_LEVEL filters affect emitted messages. | [cli.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/cli.js), [index.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/index.js) | Material limits documented; service compatibility remains open |
| Existing checks | [test/smoke.test.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/test/smoke.test.js) | Test source read; no passing-run claim |

## Documentation inventory and disposition

| Existing document | Decision |
| --- | --- |
| [README.md](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/README.md) | Rewritten with source-specific purpose, direct checkout setup, limitations and verification status. Old section fragments retained where practical. |

Added `docs/REFERENCE.md` for the observed implementation and command surface, and this research record. Protected license and attribution files remain in their original locations without edits. No source or product UI was changed.

## Quality dimensions

| Dimension | Status | Evidence / next step |
| --- | --- | --- |
| Pinned provenance | Verified | Captured commit, tree and per-file hashes recorded below |
| Interface documentation | Partially verified | Source inspection only; run clean-checkout quickstart |
| Runtime behavior | Unverified | No repository execution in this review |
| Test results | Unverified | Existing tests were not run |
| Deployment / package availability | Unverified | No remote publish or live-service check |
| Visual / link checks | Unverified | Portfolio renderer and independent QA are separate from this authoring step |

## Editorial follow-up

Added public library options/methods and CLI commands. Clarified search forwards query only rather than all advertised view filters.

## Unresolved issues

Redaction only covers configured keys and is not a complete secret detector. Logging can write sensitive context to stdout or an optional JSON file. DEBUG and LOG_LEVEL filters affect emitted messages.

## Captured source inventory

This lists captured provenance, not a claim that every line received a full audit. Binary/generated/excluded files are outside the eligible text capture.

| File | SHA-256 | Bytes |
| --- | --- | --- |
| [LICENSE](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/LICENSE) | `68729cab364d82364078b08d8580ccfa51dc69c81a7d64e8d8d47a1da6c9349d` | 1072 |
| [README.md](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/README.md) | `c208bb687719af67a4006c0e7159494e1f38d9ece41107adedc90551e40611eb` | 2323 |
| [package.json](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/package.json) | `f458963aaa2f1910b60ff2a0abd03c0a213b5d14c4fd6dd4e1a41b8d06d69313` | 702 |
| [.github/workflows/ci.yml](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/.github/workflows/ci.yml) | `e818f4e6bd805f798665dbbf04964d02f12fc59dd7f18903ad63d26d374ae3f0` | 380 |
| [cli.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/cli.js) | `bd6d7e8dab0fb7c9d5578d0ec33cf5730894a3e9baf1881ca99e5ed5fdf5e418` | 14149 |
| [index.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/index.js) | `71709e42f2e1a8656b6fbfe23a086d4213458de66fa8378979a6c99635c89b67` | 11761 |
| [test/smoke.test.js](https://github.com/NickCirv/debug-log/blob/d7f39a7057383fa14fc54f37bdbee327ce4d9879/test/smoke.test.js) | `93c7df436b6a939f849fc90f8c8d8a511a16213b5fb8756c506771370e2f2ce1` | 336 |
