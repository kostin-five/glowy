#!/bin/sh
set -eu

backend_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repository_root=$(CDPATH= cd -- "$backend_root/.." && pwd)
inventory="$repository_root/docs/backend-source-inventory.md"

javascript_files=$(find \
  "$backend_root/constants" \
  "$backend_root/lib" \
  "$backend_root/middleware" \
  "$backend_root/routes" \
  "$backend_root/scripts" \
  "$backend_root/services" \
  "$backend_root/test" \
  "$backend_root/type-tests" \
  "$backend_root/types" \
  "$backend_root/utils" \
  -type f -name '*.js' -print)

for entrypoint in "$backend_root/app.js" "$backend_root/server.js"; do
  if [ -f "$entrypoint" ]; then
    javascript_files="${javascript_files}${javascript_files:+
}$entrypoint"
  fi
done

if [ -n "$javascript_files" ]; then
  echo "Backend inventory gate failed: JavaScript source remains:" >&2
  echo "$javascript_files" >&2
  exit 1
fi

converted_count=$(awk -F '|' '$6 ~ /converted/ { count += 1 } END { print count + 0 }' "$inventory")
pending_count=$(awk -F '|' '$6 ~ /pending|excluded/ { count += 1 } END { print count + 0 }' "$inventory")

if [ "$converted_count" -ne 95 ] || [ "$pending_count" -ne 0 ]; then
  echo "Backend inventory gate failed: expected 95 converted and 0 pending/excluded; got $converted_count converted and $pending_count pending/excluded." >&2
  exit 1
fi

awk -F '`' '/^\| `backend\/.*\.js`/ { print $2 }' "$inventory" |
while IFS= read -r original; do
  target="$repository_root/${original%.js}.ts"
  if [ ! -f "$target" ]; then
    echo "Backend inventory gate failed: converted target is missing: ${original%.js}.ts" >&2
    exit 1
  fi
done

find \
  "$backend_root/constants" \
  "$backend_root/lib" \
  "$backend_root/middleware" \
  "$backend_root/routes" \
  "$backend_root/scripts" \
  "$backend_root/services" \
  "$backend_root/test" \
  "$backend_root/type-tests" \
  "$backend_root/types" \
  "$backend_root/utils" \
  -type f -name '*.ts' -print |
while IFS= read -r target; do
  relative=${target#"$backend_root/"}
  original="backend/${relative%.ts}.js"
  if ! grep -Fq "\`$original\`" "$inventory" &&
     ! grep -Fq "\`backend/$relative\`" "$inventory"; then
    echo "Backend inventory gate failed: undeclared TypeScript source: backend/$relative" >&2
    exit 1
  fi
done

for target in "$backend_root/app.ts" "$backend_root/server.ts" "$backend_root/prisma.config.ts"; do
  relative=${target#"$backend_root/"}
  original="backend/${relative%.ts}.js"
  if ! grep -Fq "\`$original\`" "$inventory" &&
     ! grep -Fq "\`backend/$relative\`" "$inventory"; then
    echo "Backend inventory gate failed: undeclared TypeScript source: backend/$relative" >&2
    exit 1
  fi
done

echo "Backend TypeScript inventory passed: 95/95 converted, no JavaScript or undeclared TypeScript source files."
