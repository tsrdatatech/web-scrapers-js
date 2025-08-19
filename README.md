# Universal Web Scraper

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-Passing-green)](https://github.com/tsrdatatech/web-scrapers-js/actions)
[![Test Coverage](https://img.shields.io/badge/Coverage-70%25-yellow)](https://github.com/tsrdatatech/web-scrapers-js)
[![Node.js](https://img.shields.io/badge/Node.js-22+-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Enterprise-grade web scraping framework showcasing modern JavaScript architecture, containerization, and DevOps best practices.**

## 🎯 Portfolio Highlights

This project demonstrates:

- **Modern JavaScript** (ES2024, Node.js 22+) with enterprise patterns
- **Scalable Architecture** - Plugin-based parser system with dependency injection
- **Production DevOps** - Docker containerization, CI/CD pipelines, comprehensive testing
- **Type Safety** - Runtime validation with Zod schemas
- **Performance** - Concurrent processing with intelligent queue management
- **Observability** - Structured logging and monitoring capabilities

## 🚀 Technical Features

- **🏗️ Pluggable Architecture** - Extensible parser system with auto-discovery
- **🎭 Browser Automation** - Headless Chrome via Playwright with smart pooling
- **✅ Type-Safe Validation** - Runtime schema validation with Zod
- **📊 Observability** - Structured JSON logging with Pino
- **🔄 Resilient Processing** - Built-in queue management, retries, and error handling
- **🐳 Containerized** - Multi-stage Docker builds optimized for production
- **🧪 Test-Driven** - Comprehensive Jest test suite with mocking
- **🔧 DevOps Ready** - GitHub Actions CI/CD with automated testing and security scanning

## �️ Architecture & Tech Stack

| Component            | Technology           | Purpose                             |
| -------------------- | -------------------- | ----------------------------------- |
| **Runtime**          | Node.js 22+          | Modern JavaScript runtime           |
| **Scraping Engine**  | Crawlee + Playwright | Enterprise web scraping framework   |
| **Type Safety**      | Zod                  | Runtime schema validation           |
| **Logging**          | Pino                 | High-performance structured logging |
| **Testing**          | Jest                 | Unit and integration testing        |
| **Code Quality**     | ESLint + Prettier    | Automated code formatting & linting |
| **Containerization** | Docker + Kubernetes  | Multi-stage builds & orchestration  |
| **CI/CD**            | GitHub Actions       | Automated testing & deployment      |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run a single URL
npm start -- --url https://example.com --parser generic-news

# Process multiple URLs from file
npm start -- --file seeds.txt --parser auto
```

### Example Usage

The `seeds.txt` file supports multiple formats:

```text
https://www.example.com/article1
https://www.example.com/article2
{"url": "https://news.site.com", "parser": "generic-news"}
{"url": "https://weibo.com/user", "parser": "weibo"}
```

## ⚙️ Configuration Options

| Parameter       | Description                          | Default   |
| --------------- | ------------------------------------ | --------- |
| `--url`         | Single URL to process                | -         |
| `--file`        | Path to seeds file                   | -         |
| `--parser`      | Parser to use (`auto` for detection) | `auto`    |
| `--concurrency` | Concurrent requests                  | 2         |
| `--maxRequests` | Maximum requests to process          | unlimited |
| `--delayMin`    | Minimum delay between requests (ms)  | 500       |
| `--delayMax`    | Maximum delay between requests (ms)  | 1500      |

## 🐳 Docker Deployment

Multi-stage containerization for different environments:

```bash
# Build and run production container
make docker-build && make docker-run

# Development with live reload
make docker-dev

# Run test suite in container
make docker-test
```

### Container Architecture

- **Development Stage**: Full toolchain with hot reload
- **Testing Stage**: Isolated environment for CI/CD
- **Production Stage**: Minimal runtime optimized for performance
- **Security Features**: Non-root user, health checks, minimal attack surface

## ☸️ Kubernetes Deployment

Enterprise-ready Kubernetes manifests for cloud deployment:

```bash
# Deploy to Kubernetes cluster
kubectl apply -f k8s/

# Or use the convenience script
./k8s/deploy.sh

# Check deployment status
kubectl get pods -n web-scraper
kubectl logs -f deployment/web-scraper -n web-scraper
```

### Kubernetes Features

- **Namespace Isolation** - Dedicated namespace for resource organization
- **ConfigMap Management** - Environment configuration without secrets
- **Resource Limits** - CPU/memory constraints for predictable performance
- **Health Probes** - Liveness and readiness checks for reliability
- **Service Discovery** - Internal networking and load balancing

## 🔧 Extending the Framework

### Creating Custom Parsers

The plugin architecture allows easy extension for new sites:

```javascript
import { BaseParser } from '../core/base-parser.js'
import { z } from 'zod'

const MyParserSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  publishedAt: z.date().optional(),
})

export default class MyCustomParser extends BaseParser {
  id = 'my-site'
  domains = ['example.com']
  schema = MyParserSchema

  async canParse(url) {
    return /example\.com/.test(url)
  }

  async parse(page, ctx) {
    const title = await page.textContent('h1')
    const content = await page.textContent('article')

    return this.schema.parse({
      id: ctx.request.id,
      title,
      content,
      publishedAt: new Date(),
    })
  }
}
```

### Parser Auto-Discovery

The framework automatically registers parsers found in `src/parsers/` directory, enabling plug-and-play functionality for new sites.

## ⚡ Environment Configuration

### Deployment Configuration

The framework uses a single `crawlee.json` configuration file optimized for all environments:

```json
{
  "persistStorage": false,
  "logLevel": "INFO"
}
```

This single configuration works perfectly for all deployment scenarios:

**🎯 Universal Configuration Benefits:**

- **Development**: Clean runs with no storage persistence
- **Production**: Add `CRAWLEE_PERSIST_STORAGE=true` if storage needed
- **Serverless**: Perfect as-is (no storage, minimal footprint)
- **Docker**: Works in containers without modification

### Environment Overrides

Override configuration through environment variables when needed:

```bash
# Enable storage for production if needed
export CRAWLEE_PERSIST_STORAGE=true
export CRAWLEE_LOG_LEVEL=ERROR

# Run with overrides
npm start
```

### Key Configuration Benefits

- **🚀 No storage by default** - Prevents disk bloat, perfect for serverless
- **📊 Appropriate logging** - INFO level provides good visibility
- **🔧 Environment flexibility** - Override via env vars when needed
- **🐳 Docker-ready** - Works in containers without modification

### Serverless Deployment

Optimized for AWS Lambda, Google Cloud Functions, and similar platforms:

- No filesystem persistence required
- Minimal logging overhead
- Memory-efficient browser management
- Environment variable configuration support

## 🔄 Data Processing

### Parser Selection Logic

1. Forced via CLI (`--parser <id>`). Use `--parser auto` to disable forcing.
2. First parser whose `canParse(url)` returns truthy.
3. Fallback: attempt article extraction; if a title is found and `generic-news` exists, use it.

### Output Format

Validated JSON objects printed to stdout (one per line) + structured logs to stderr:

```json
{
  "id": "article_123",
  "title": "Sample Article",
  "content": "...",
  "publishedAt": "2024-01-01"
}
```

Results can be easily adapted for various outputs (database, message queue, file storage).

## 🔒 Production Considerations

### Rate Limiting & Reliability

- Configurable concurrency limits (default: 2 concurrent requests)
- Random delays between requests (500-1500ms) for respectful scraping
- Built-in retry mechanisms with exponential backoff
- Request queue management for large-scale operations

### Security & Monitoring

- Structured logging for audit trails and debugging
- Health checks for containerized deployments
- Non-root user execution in Docker containers
- Environment-based configuration management

## 🧪 Testing & Quality Assurance

```bash
# Run test suite
npm test

# Generate coverage report
npm run test:coverage

# Code quality checks
npm run lint && npm run format:check

# Full validation pipeline
npm run validate
```

## 📈 Future Enhancements

- **Storage Adapters**: S3, PostgreSQL, MongoDB integrations
- **Monitoring**: Prometheus metrics and alerting
- **Scaling**: Distributed processing with message queues
- **Advanced Parsing**: ML-based content extraction
- **API Gateway**: RESTful interface for remote operations

## 📋 Technical Requirements

- **Node.js**: 22.0.0 or higher
- **Memory**: 2GB+ recommended for browser operations
- **Storage**: Configurable (local filesystem or external)
- **Network**: HTTP/HTTPS access for target sites

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Built with ❤️ to demonstrate enterprise-grade JavaScript architecture and modern DevOps practices.**
