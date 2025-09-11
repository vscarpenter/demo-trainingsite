#!/usr/bin/env bash
# Auto-generated deployment script for Development
# Generated on 2025-09-10T02:42:58.269Z

set -euo pipefail

echo "🚀 Deploying to Development environment..."

# Build the application
echo "📦 Building application..."
npm run build

# Local deployment
echo "📁 Build complete. Files available in dist/"
echo "💡 Run 'npm run preview' to test the build locally"

echo "✅ Deployment to Development complete!"
