#!/usr/bin/env bash
# Runs on every Claude Stop event.
# Commits all staged/unstaged changes and pushes to the remote if one exists.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

# Nothing to do if this isn't a git repo yet
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "auto-commit-push: not a git repo, skipping"
  exit 0
fi

# Nothing to commit?
if git diff --quiet && git diff --staged --quiet; then
  echo "auto-commit-push: nothing to commit"
  exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

git add -A
git commit -m "auto: claude session ${TIMESTAMP}"

# Push only when a tracking remote exists
if git remote get-url origin > /dev/null 2>&1; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  git push origin "${BRANCH}" && echo "auto-commit-push: pushed ${BRANCH}" \
    || echo "auto-commit-push: push failed (will retry next session)"
else
  echo "auto-commit-push: no remote configured, commit saved locally"
fi
