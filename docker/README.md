# Docker Configuration

This directory contains all Docker-related files for the Universal Web Scraper project.

## Files

- `Dockerfile` - Multi-stage Docker build configuration
- `docker-compose.yml` - Orchestration for different environments
- `.dockerignore` - Files to exclude from Docker builds

## Multi-Stage Dockerfile

The Dockerfile includes three optimized stages:

### Development Stage

- Includes development dependencies
- Volume mounting for live code changes
- Debugging tools available
- Port 3000 exposed for development server

### Testing Stage

- Runs complete test suite
- Generates coverage reports
- Validates code quality
- Exit code reflects test results

### Production Stage

- Minimal runtime dependencies only
- Non-root user for security
- Health checks included
- Optimized for performance

## Docker Compose Profiles

### Default Profile

- `scraper` - Production-ready container

### Development Profile (`dev`)

- `scraper-dev` - Development environment with volume mounting
- Hot reload capabilities
- Debug logging enabled

### Testing Profile (`test`)

- `scraper-test` - Isolated testing environment
- Coverage reports generated

### Optional Profiles

- `redis` - Redis cache for queue management
- `dashboard` - Nginx dashboard for monitoring

## Quick Commands

```bash
# Production deployment
docker-compose -f docker/docker-compose.yml up scraper

# Development with live reload
docker-compose -f docker/docker-compose.yml --profile dev up scraper-dev

# Run tests in container
docker-compose -f docker/docker-compose.yml --profile test up scraper-test

# Full development stack with Redis
docker-compose -f docker/docker-compose.yml --profile dev --profile redis up

# Monitoring dashboard
docker-compose -f docker/docker-compose.yml --profile dashboard up dashboard
```

## Build Options

### Production Build

```bash
docker build -f docker/Dockerfile --target production -t web-scraper:prod .
```

### Development Build

```bash
docker build -f docker/Dockerfile --target development -t web-scraper:dev .
```

### Testing Build

```bash
docker build -f docker/Dockerfile --target testing -t web-scraper:test .
```

## Environment Variables

### Container Configuration

- `NODE_ENV` - Environment (development/test/production)
- `LOG_LEVEL` - Logging verbosity (debug/info/warn/error)
- `MAX_CONCURRENCY` - Maximum parallel requests

### Scraper Configuration

- All standard environment variables are supported
- Mount `.env` file for sensitive configuration
- Use Docker secrets for production credentials

## Volume Mounts

### Development

- `./:/app` - Live code mounting
- `/app/node_modules` - Named volume for dependencies

### Production

- `./storage:/app/storage` - Persistent data storage
- `./seeds.txt:/app/seeds.txt:ro` - Read-only seed configuration
- `./.env:/app/.env:ro` - Read-only environment configuration

## Security Features

- Non-root user (node:node)
- Minimal attack surface in production
- Security scanning in CI/CD
- Read-only file system where possible
- Health checks for container monitoring

## Performance Optimizations

- Multi-stage builds reduce image size
- Layer caching for faster rebuilds
- Alpine-based images for minimal footprint
- Playwright browser optimization
- Production dependencies only in final stage

## Troubleshooting

### Common Issues

1. **Permission denied errors**
   - Ensure proper user permissions in container
   - Check volume mount permissions

2. **Browser not found**
   - Ensure Playwright browsers are installed
   - Check Dockerfile browser installation steps

3. **Out of memory**
   - Increase Docker memory limits
   - Reduce MAX_CONCURRENCY setting

4. **Network connectivity**
   - Check proxy configuration
   - Verify network bridge settings

### Debug Commands

```bash
# Shell into running container
docker exec -it web-scraper /bin/sh

# Check container logs
docker logs web-scraper

# Inspect container configuration
docker inspect web-scraper

# Monitor resource usage
docker stats web-scraper
```

## Best Practices

1. **Development**
   - Use development profile for active development
   - Mount source code for live reload
   - Enable debug logging

2. **Testing**
   - Use isolated testing containers
   - Generate coverage reports
   - Validate in clean environment

3. **Production**
   - Use production-optimized images
   - Enable health checks
   - Configure proper resource limits
   - Use secrets management

4. **Security**
   - Regular base image updates
   - Scan for vulnerabilities
   - Use non-root users
   - Limit network access
