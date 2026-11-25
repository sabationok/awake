#!/bin/bash
# Збирає агента (один agent.cjs) і статичний пульт у Resources/agent для бандла Mac-аппки.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile >/dev/null
pnpm --filter @awake/agent build
pnpm --filter @awake/web build:local
rm -rf Resources/agent
mkdir -p Resources/agent
cp agent/dist/agent.cjs Resources/agent/agent.cjs
cp -R web/out Resources/agent/web
node scripts/build-info.mjs
echo "Агент: Resources/agent ($(du -sh Resources/agent | cut -f1))"
