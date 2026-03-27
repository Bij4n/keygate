# Contributing to Keygate

Thank you for your interest in contributing to Keygate. This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/Bij4n/keygate.git
cd keygate
npm run init    # installs dependencies, builds core, runs tests
npm run demo    # starts the development server
```

## Project Structure

```
keygate/
  packages/
    core/         # Vault, encryption, anomaly detection, policy engine
    server/       # Express REST API
    dashboard/    # Next.js web dashboard
    mcp/          # MCP server for agent integration
    sdk/          # TypeScript client SDK
    langchain/    # Python SDK with LangChain support
  examples/       # Example projects
  scripts/        # Build and setup scripts
```

## Making Changes

1. **Fork the repository** and create a feature branch from `main`
2. **Write tests** for any new functionality in `packages/core/src/__tests__/`
3. **Run the test suite** before submitting: `npm test --workspace=packages/core`
4. **Build the core package** to verify types: `npm run build --workspace=packages/core`
5. **Submit a pull request** with a clear description of the change

## Code Style

- TypeScript with strict mode
- Functional patterns where appropriate
- Zod for input validation
- No direct `console.log` in library code (use structured logging in server)
- Meaningful variable names and concise comments

## Testing

Tests are written with Vitest. Run them with:

```bash
npm test                              # all packages
npm test --workspace=packages/core    # core only
```

When adding a new module, add a corresponding test file at `packages/core/src/__tests__/<module>.test.ts`.

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include tests for new features
- Update documentation if the API changes
- Reference any related issues

## Reporting Issues

Use GitHub Issues for bug reports and feature requests. For security vulnerabilities, see [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
