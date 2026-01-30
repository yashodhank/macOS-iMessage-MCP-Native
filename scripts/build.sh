#!/bin/bash
set -e

# iMessage MCP macOS Single Binary Build Script
# This script uses 'pkg' to create the binary and 'codesign' to apply entitlements.

echo "🚀 Starting macOS single binary build..."

# 1. Build and Bundle
echo "📦 Building TypeScript..."
npm run build

# 2. Package with pkg
echo "🏗️  Packaging with pkg..."
mkdir -p bin
# We use node18 as it is well supported by pkg 5.x
npx pkg . --targets node18-macos-arm64,node18-macos-x64 --out-path bin

# Rename for clarity
mv bin/imessages-mcp-macos-arm64 bin/imessage-mcp-arm64 2>/dev/null || true
mv bin/imessages-mcp-macos-x64 bin/imessage-mcp-x64 2>/dev/null || true

# 3. Sign with entitlements (for current architecture)
ARCH=$(uname -m)
OUT_FILE="bin/imessage-mcp-$ARCH"

if [ -f "$OUT_FILE" ]; then
    echo "📜 Signing $OUT_FILE with entitlements..."
    codesign --sign - --entitlements entitlements.plist --force "$OUT_FILE"
    echo "✅ Signed binary: $OUT_FILE"
else
    echo "⚠️  Binary for $ARCH not found, skipping signing."
fi

echo "🎉 Build process complete!"
echo "Note: Native modules (better-sqlite3) are required to be in the same environment."
