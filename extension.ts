import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFile } from "node:child_process";

// The plugin has no npm dependency on xerj — it drives the installed CLI.
// XERJ_BIN overrides the binary (e.g. a dev build). Lookup happens per call,
// never at load, so `omp` startup stays untouched.
const USAGE = [
	"Usage: /xerj <subcommand> [args]",
	"  /xerj autoindex <folder>     zero-config index a folder",
	"  /xerj autoindex status       index progress",
	"  /xerj brain <folder>         index + browse a second brain",
	"  /xerj code <corpus> \"<query>\"  reference-coding retrieval",
	"  /xerj corpus list            corpora behind `xerj code`",
	"  /xerj --help                 full CLI help",
	"Env: XERJ_BIN (default: xerj on PATH)",
].join("\n");

// Quote-aware split so /xerj code mycorp "how do they paginate" keeps the
// phrase in one argv entry. ponytail: no backslash escapes — add when a
// query actually needs a literal quote.
function splitArgs(s: string): string[] {
	const out: string[] = [];
	let cur = "";
	let quote: string | null = null;
	for (const ch of s) {
		if (quote) {
			if (ch === quote) quote = null;
			else cur += ch;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
		} else if (ch === " " || ch === "\t") {
			if (cur) out.push(cur);
			cur = "";
		} else {
			cur += ch;
		}
	}
	if (cur) out.push(cur);
	return out;
}

function run(argv: string[]): Promise<{ code: number | null; stdout: string; stderr: string; error?: string }> {
	const { promise, resolve } = Promise.withResolvers<{
		code: number | null;
		stdout: string;
		stderr: string;
		error?: string;
	}>();
	// large maxBuffer: `autoindex` logs a lot; no timeout — indexing can run long
	execFile(
		process.env.XERJ_BIN || "xerj",
		argv,
		{ maxBuffer: 16 * 1024 * 1024 },
		(err, stdout, stderr) => {
			if (err instanceof Error && "code" in err && err.code === "ENOENT") {
				resolve({ code: null, stdout, stderr, error: "not-found" });
				return;
			}
			const code = err && "code" in err && typeof err.code === "number" ? err.code : err ? 1 : 0;
			resolve({ code, stdout, stderr });
		},
	);
	return promise;
}

export default function ompXerj(pi: ExtensionAPI) {
	pi.registerCommand("xerj", {
		description: "Run the xerj CLI: /xerj <subcommand> [args] (autoindex, brain, code, corpus, ...)",
		handler: async (args, ctx) => {
			const raw = String(args || "").trim();
			if (!raw) {
				ctx.ui.notify(USAGE, "info");
				return;
			}
			try {
				const argv = splitArgs(raw);
				const r = await run(argv);
				if (r.error === "not-found") {
					ctx.ui.notify(
						"xerj binary not found. Install: curl -fsSL https://xerj.org/get | sh (or set XERJ_BIN)",
						"error",
					);
					return;
				}
				if (r.code === 0) {
					const out = r.stdout.trim();
					return out || "(no output)";
				}
				const detail = (r.stderr.trim() || r.stdout.trim() || "(no output)").slice(0, 4000);
				ctx.ui.notify(`xerj ${argv.join(" ")} failed (exit ${r.code}):\n${detail}`, "error");
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				ctx.ui.notify(`xerj failed: ${msg}`, "error");
			}
		},
	});
}
