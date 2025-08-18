#!/bin/bash

# Setup script to configure GitHub Actions
# This script sets up the CI/CD pipeline by creating the necessary GitHub workflows directory
# and linking our CI configurations

set -e

echo "Setting up GitHub Actions CI/CD pipeline..."

# Create .github/workflows directory
mkdir -p .github/workflows

# Copy CI configurations to GitHub workflows directory
cp ci/ci.yml .github/workflows/
cp ci/security.yml .github/workflows/ 2>/dev/null || echo "security.yml not found, skipping..."

echo "GitHub Actions setup complete!"
echo "Your CI/CD pipeline is now configured."
echo ""
echo "Available workflows:"
ls -la .github/workflows/

echo ""
echo "To customize the CI/CD pipeline, edit files in the ci/ directory"
echo "and run this script again to update GitHub Actions."
