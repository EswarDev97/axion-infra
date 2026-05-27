# TypeScript Hook Automation

Per-file post-edit quality checks for TypeScript files.

## Commands

| Tool | Command | Purpose |
|------|---------|---------|
| Type check | `npx tsc --noEmit` | Zero-error compile check |
| Format | `npx biome format --write .` or `npx prettier --write .` | Consistent style |
| Lint | `npx biome lint .` or `npx eslint .` | Style + logic rules |

## CI Mode (non-modifying)

```bash
npx tsc --noEmit                   # type errors fail CI
npx biome check --reporter=github  # format + lint in one pass
```

## console.log Warning

`console.log` in `*.ts`/`*.tsx` (outside tests/scripts) triggers the `no-console-log` advisory rule.
Replace with your project's structured logger before committing.

## Type Check on Save

Configure your editor to run `tsc --noEmit` on save for instant feedback.
In VS Code: install the TypeScript extension and enable "Check on Save" in workspace settings.
