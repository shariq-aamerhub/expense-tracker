#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# git-push.sh — stage, commit, and push changes to origin
# Usage:
#   ./git-push.sh                        # prompts for commit message
#   ./git-push.sh "your commit message"  # non-interactive
# ---------------------------------------------------------------------------

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# ── 1. Check for anything to commit ────────────────────────────────────────
if git diff --quiet && git diff --cached --quiet && [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to commit — working tree is clean."
  exit 0
fi

# ── 2. Show what will be committed ─────────────────────────────────────────
echo ""
echo "Changes to be committed:"
git status --short
echo ""

# ── 3. Get commit message ──────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  MSG="$1"
else
  read -rp "Commit message: " MSG
fi

if [ -z "$MSG" ]; then
  echo "Aborted — commit message cannot be empty."
  exit 1
fi

# ── 4. Stage, commit, push ─────────────────────────────────────────────────
git add -A
git commit -m "$MSG"

echo ""
echo "Pushing to origin/$BRANCH..."
git push -u origin "$BRANCH"

echo ""
echo "Done — pushed to origin/$BRANCH"
