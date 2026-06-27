#!/usr/bin/env bash
set -euo pipefail

CURRENT_BRANCH=$(git branch --show-current)

echo ""
echo "Current branch: $CURRENT_BRANCH"
echo ""
echo "Do you want to push to the current branch or create a new branch?"
echo "  1) Keep current branch ($CURRENT_BRANCH)"
echo "  2) Create a new branch"
echo ""
read -rp "Enter choice [1/2]: " CHOICE

case "$CHOICE" in
  1)
    BRANCH="$CURRENT_BRANCH"
    echo "Pushing to existing branch: $BRANCH"
    ;;
  2)
    read -rp "Enter new branch name: " NEW_BRANCH
    if [[ -z "$NEW_BRANCH" ]]; then
      echo "Error: Branch name cannot be empty."
      exit 1
    fi
    git checkout -b "$NEW_BRANCH"
    BRANCH="$NEW_BRANCH"
    echo "Created and switched to new branch: $BRANCH"
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
git add -A
git status

echo ""
read -rp "Enter commit message: " COMMIT_MSG
if [[ -z "$COMMIT_MSG" ]]; then
  echo "Error: Commit message cannot be empty."
  exit 1
fi

git commit -m "$COMMIT_MSG"
git push -u origin "$BRANCH"

echo ""
echo "Successfully pushed to branch: $BRANCH"
# git push helper
