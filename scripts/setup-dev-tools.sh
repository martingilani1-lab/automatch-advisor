#!/usr/bin/env bash
# One-time setup of the command-line tools behind the Claude Code plugins in .claude/settings.json.
# Run once per Codespace (they live in the Codespace, not in git):  bash scripts/setup-dev-tools.sh
#
#   mempalace    -> needed by the mempalace plugin (its MCP server runs `mempalace-mcp`)
#   headroom-ai  -> context compression for Claude Code; NOT a plugin, you start Claude through it:
#                     headroom wrap claude
#   Playwright   -> the playwright plugin downloads its own browser on first use; nothing to install here.
set -euo pipefail

echo "== Installing MemPalace and Headroom (Python) =="
python3 -m pip install --user --upgrade mempalace "headroom-ai[all]"

# pip --user puts scripts in ~/.local/bin; make sure the shell can find them
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$HOME/.local/bin"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  export PATH="$HOME/.local/bin:$PATH"
fi

echo "== Creating the memory palace for this repo (first time only) =="
if [ ! -f mempalace.yaml ]; then
  mempalace init "$(pwd)"
fi
mempalace mine "$(pwd)"

echo
echo "Done. Restart Claude Code, then run /plugin to check: frontend-design, playwright, mempalace."
echo "To use Headroom, start Claude Code with:  headroom wrap claude"
