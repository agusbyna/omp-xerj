# omp-xerj

Thin omp plugin wrapper around the [xerj](https://xerj.org/) CLI.

Drives the `xerj` binary directly (no npm dep). Provides the `/xerj` slash command in omp: run autoindex, brain, code, corpus, etc. while keeping omp startup fast.

## Prerequisites

1. **Install xerj** (one-liner):
   ```sh
   curl -fsSL https://xerj.org/get | sh
   ```
   This puts `xerj` in `~/.local/bin/` (and the installer updates PATH if needed). Alternatively set `XERJ_BIN=/path/to/xerj`.

2. **(Optional) Point to a running server.** For long-running `xerj autoindex brain` etc., you may want `XERJ_URL=http://localhost:9200` and `XERJ_API_KEY` exported; the plugin just passes args to the CLI, so the CLI's own env vars work as-is.

## Install in omp

Link locally (dev):
```sh
omp plugin link /tmp/omp-xerj
```

Or install from GitHub once published:
```sh
omp plugin install github:agusbyna/omp-xerj
```

Verify:
```sh
omp plugin list
omp plugin doctor
```

## Usage

```
/xerj <subcommand> [args]
```

Examples:
- `/xerj autoindex /home/agusbyna/Work` — zero-config index a folder
- `/xerj autoindex status` — progress
- `/xerj brain .` — index + browse second brain
- `/xerj code mycorp "how do they paginate?"` — reference-coding retrieval (use quotes for phrases)
- `/xerj corpus list` — corpora
- `/xerj --help` — full help

Notes:
- Args are split quote-aware (single/double quotes) so multi-word strings stay intact. No backslash-escape handling yet — avoid quotes inside quoted phrases.
- Large outputs from `autoindex`/`brain` are allowed (maxBuffer 16MB). Indexing can be long-running; the plugin does not enforce a timeout.
- If `xerj` is not found, it notifies with install hint and `XERJ_BIN` override.

## Development

```sh
cd /tmp/omp-xerj
node --check extension.ts
omp plugin link .
```

## License

MIT
