# Release Steps

## Prerequisites

- npm account with publish access
- If using a scoped package (e.g. `@your-org/promptlab-mcp`), ensure the scope is configured

## Release Process

1. **Update version** (choose one):
   ```bash
   npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
   npm version minor   # 1.0.0 → 1.1.0 (new features)
   npm version major   # 1.0.0 → 2.0.0 (breaking changes)
   ```

2. **Update CHANGELOG.md** with the new version and changes

3. **Publish to npm**:
   ```bash
   cd packages/promptlab-mcp
   npm publish
   ```
   For unscoped packages, use `npm publish --access public` if this is the first publish.

4. **Tag the release** (optional):
   ```bash
   git tag promptlab-mcp-v1.0.0
   git push origin promptlab-mcp-v1.0.0
   ```
