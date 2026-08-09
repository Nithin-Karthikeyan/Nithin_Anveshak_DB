#!/usr/bin/env bash
set -euo pipefail

# Build the frontend CSS with the Tailwind CSS standalone CLI (no Node needed).
#
# Usage:
#   bash scripts/build-css.sh            # one-off build (minified)
#   bash scripts/build-css.sh --watch    # watch for changes
#   TAILWIND_VERSION=v4.3.3 bash scripts/build-css.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="${ROOT_DIR}/.tools"
TAILWIND_VERSION="${TAILWIND_VERSION:-v4.3.3}"
BINARY="${TOOLS_DIR}/tailwindcss-${TAILWIND_VERSION}"

INPUT="${ROOT_DIR}/static/css/input.css"
OUTPUT="${ROOT_DIR}/static/css/app.css"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) ASSET="tailwindcss-linux-x64" ;;
  Linux-aarch64) ASSET="tailwindcss-linux-arm64" ;;
  Darwin-x86_64) ASSET="tailwindcss-macos-x64" ;;
  Darwin-arm64) ASSET="tailwindcss-macos-arm64" ;;
  *)
    echo "Unsupported platform: $(uname -s)-$(uname -m)" >&2
    exit 1
    ;;
esac

mkdir -p "${TOOLS_DIR}"

if [ ! -x "${BINARY}" ]; then
  URL="https://github.com/tailwindlabs/tailwindcss/releases/download/${TAILWIND_VERSION}/${ASSET}"
  echo "Downloading Tailwind CSS ${TAILWIND_VERSION} (${ASSET})..."
  curl -fL --retry 3 -o "${BINARY}" "${URL}"
  chmod +x "${BINARY}"
fi

ARGS=(-i "${INPUT}" -o "${OUTPUT}" --minify)
if [ "${1:-}" = "--watch" ]; then
  ARGS+=(--watch)
fi

"${BINARY}" "${ARGS[@]}"
echo "Built ${OUTPUT}"
