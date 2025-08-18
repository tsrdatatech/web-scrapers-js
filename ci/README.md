# CI/CD Configuration

This directory contains all CI/CD related configuration files for the Universal Web Scraper project.

## Files

- `ci.yml` - Main GitHub Actions workflow for testing and building
- `setup-github-actions.sh` - Script to set up GitHub Actions from this directory

## GitHub Actions Setup

To set up GitHub Actions CI/CD pipeline:

```bash
./ci/setup-github-actions.sh
```

This script will:

1. Create the `.github/workflows/` directory
2. Copy CI configuration files to the workflows directory
3. Set up the automated testing and building pipeline

## Workflow Features

### Main CI Pipeline (`ci.yml`)

- **Multi-Node Testing**: Tests against Node.js 18, 20, and latest LTS
- **Comprehensive Testing**: Runs full Jest test suite with coverage reporting
- **Code Quality**: ESLint and Prettier checks
- **Security Scanning**: npm audit for dependency vulnerabilities
- **Docker Build**: Validates Docker container builds
- **Artifact Storage**: Saves test coverage reports

### Triggers

- Push to `main` branch
- Pull requests to `main` branch
- Manual workflow dispatch

## Customization

To modify the CI/CD pipeline:

1. Edit the configuration files in this `ci/` directory
2. Run `./ci/setup-github-actions.sh` to update GitHub Actions
3. Commit and push the changes

## Local Testing

Before pushing changes, you can test locally:

```bash
# Run tests
npm test

# Check code formatting
npm run format:check

# Run security audit
npm audit

# Build Docker image
docker build -f docker/Dockerfile .
```

## Environment Variables

The CI pipeline supports these environment variables:

- `NODE_ENV`: Set to 'test' during CI runs
- `LOG_LEVEL`: Set to 'error' to reduce noise during testing
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Adding New Workflows

To add additional workflows:

1. Create new `.yml` files in this directory
2. Update `setup-github-actions.sh` to copy the new files
3. Run the setup script to deploy changes
