#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
backend_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
dist_dir="$backend_dir/dist"

if [ "$dist_dir" != "$backend_dir/dist" ]; then
  echo "Refusing to clean an unexpected build directory" >&2
  exit 1
fi

rm -rf -- "$dist_dir"
exec "$backend_dir/node_modules/.bin/tsc" -p "$backend_dir/tsconfig.build.json"
