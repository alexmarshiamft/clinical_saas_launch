#!/usr/bin/env bash
set -e

echo "========================================================"
echo "   Clinical SaaS Platform — Build & Type Verification  "
echo "========================================================"

echo "Step 1: Running TypeScript Compiler Check (tsc --noEmit)..."
npx tsc --noEmit
echo "✓ Type check completed with 0 errors."

echo "Step 2: Executing Production Bundle (vite build)..."
npx vite build
echo "✓ Vite production bundle built successfully."

echo "Step 3: Checking build artifacts in dist/..."
if [ ! -f "dist/index.html" ]; then
  echo "❌ Error: dist/index.html not found!"
  exit 1
fi

echo "✓ dist/index.html verified."
echo "========================================================"
echo "✓ ALL CHECKS PASSED: Application built cleanly with 0 errors!"
echo "========================================================"
