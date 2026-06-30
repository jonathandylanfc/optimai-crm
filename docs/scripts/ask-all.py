#!/usr/bin/env python3
"""
OptimAI CRM — Consensus fan-out script (v1.1)
Usage: python3 ask-all.py <prompt_file.md>
Keys loaded from environment (set in ~/.claude/settings.json env block).
"""

import urllib.request, json, os, sys, threading, time
from pathlib import Path

BASE = "https://openrouter.ai/api/v1/chat/completions"
CONSENSUS_DIR = Path(__file__).parent.parent / "history" / "consensus"

MODELS = [
    ("gemini",  "google/gemini-2.5-pro",           "OPENROUTER_KEY_GEMINI"),
    ("gpt",     "openai/gpt-4o",                   "OPENROUTER_KEY_GPT"),
    ("deepseek","deepseek/deepseek-r1",             "OPENROUTER_KEY_DEEPSEEK"),
    ("llama",   "meta-llama/llama-4-maverick",      "OPENROUTER_KEY_LLAMA"),
    ("mistral", "mistralai/mistral-large",          "OPENROUTER_KEY_MISTRAL"),
]

REDACT_PATTERNS = ["sk-", "eyJ", "postgres://", "supabase.co", "service_role"]

def check_redaction(prompt: str):
    flags = [p for p in REDACT_PATTERNS if p in prompt]
    if flags:
        print(f"[WARN] Potential sensitive content detected: {flags}")
        answer = input("Proceed anyway? (yes/no): ").strip().lower()
        if answer != "yes":
            sys.exit("Aborted — redact the prompt first (see §13).")

def query_model(name: str, model: str, key_var: str, prompt: str, round_dir: Path, results: dict):
    key = os.environ.get(key_var, "")
    if not key:
        results[name] = f"ERROR: {key_var} not set in environment"
        return

    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2000
    }).encode("utf-8")

    req = urllib.request.Request(BASE, data=payload, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    })

    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            msg = data["choices"][0]["message"]
            content = msg.get("content") or ""
            if not content:
                rd = msg.get("reasoning_details") or []
                content = " ".join(r.get("text", "") for r in rd if isinstance(r, dict))
            usage = data.get("usage", {})
            cost = usage.get("cost", 0)
            results[name] = {"content": content, "cost": cost, "model": model}
            out = round_dir / f"round_X_{name}.md"
            out.write_text(f"# Vote: {name} ({model})\n\n{content}\n")
            print(f"[OK] {name} — ${cost:.4f}")
            return
        except Exception as e:
            if attempt == 0:
                print(f"[RETRY] {name}: {e}")
                time.sleep(2)
            else:
                results[name] = f"UNUSABLE: {e}"
                print(f"[FAIL] {name}: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ask-all.py <prompt_file.md>")
        sys.exit(1)

    prompt_file = Path(sys.argv[1])
    if not prompt_file.exists():
        sys.exit(f"File not found: {prompt_file}")

    prompt = prompt_file.read_text()
    check_redaction(prompt)

    CONSENSUS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\nFanning out to {len(MODELS)} models in parallel...\n")
    results = {}
    threads = [
        threading.Thread(target=query_model, args=(name, model, key_var, prompt, CONSENSUS_DIR, results))
        for name, model, key_var in MODELS
    ]
    start = time.time()
    for t in threads: t.start()
    for t in threads: t.join()
    elapsed = time.time() - start

    print(f"\nAll done in {elapsed:.1f}s")
    total_cost = sum(r["cost"] for r in results.values() if isinstance(r, dict))
    print(f"Total cost: ${total_cost:.4f}")

    valid = [n for n, r in results.items() if isinstance(r, dict)]
    unusable = [n for n, r in results.items() if not isinstance(r, dict)]
    print(f"Valid votes: {len(valid)}/5 — {valid}")
    if unusable:
        print(f"UNUSABLE: {unusable}")

if __name__ == "__main__":
    main()
