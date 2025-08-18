#!/bin/bash

# Pre-commit hook to format code with Prettier + ESLint
echo "Running Prettier + ESLint formatting..."

# Format with prettier-eslint for better integration
npm run format:eslint

# Run regular prettier for non-JS files  
npm run format

# Check if formatting was successful
if npm run format:check; then
  echo "✅ All files are properly formatted with Prettier + ESLint"
  exit 0
else
  echo "❌ Some files were not properly formatted"
  echo "Files have been formatted. Please review and commit again."
  exit 1
fi
