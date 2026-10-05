# @amurisavemylifee/eslint-config

Shared ESLint flat config (ESLint 9): TypeScript, import/export layout, plus 14 custom rules
(plugin `amuri`, taken from `gta-rp-server`, branch `refactor/architecture`).

| Custom rule | What it does |
| --- | --- |
| `amuri/boolean-name-prefix` | **type-aware only** (`typeAware` config, inactive without type info): variables, params and properties of type `boolean` start with `is`/`has`/`can`/`should`/`will`/`did`/`does`/`are`/`was`/`were` (option `{ prefixes: ['is', 'has'] }` replaces the list) |
| `amuri/boolean-function-prefix` | **type-aware only**: functions/methods returning `boolean` (or a type predicate) start with `is`/`has`/`can`/... (same `prefixes` option) |
| `amuri/no-boolean-param` | **type-aware only**: no positional `boolean` parameters, pass an options object |
| `amuri/max-function-params` | at most 3 function parameters (option `{ max }`), more — an options object |
| `amuri/class-pascal-case` | class names are `PascalCase` (no underscores, `$`, or lowercase start) |
| `amuri/curly-except-return` | braces on every `if` body except bare `return;` |
| `amuri/index-only-reexports` | `index.*` files may only contain imports and re-exports, no logic |
| `amuri/no-barrel-deep-import` | relative imports of a folder with an `index` file go through the index, not its internals; aliases via option `{ aliases: { '@': 'src' } }` |
| `amuri/no-inline-export` | no `export const/function/...`, use `export { }` blocks |
| `amuri/adjacent-same-path` | imports/re-exports from one path stay adjacent |
| `amuri/no-duplicate-same-kind` | one `import {}` + one `import type {}` per module (replaces `import/no-duplicates`) |
| `amuri/no-inline-type-specifier` | `import type { A }` instead of `import { type A }` |
| `amuri/padding-line-between-statements` | core `padding-line-between-statements` (config in `style`), but consecutive single-line `type` (or `interface`) declarations need no blank line, mixed kinds do |
| `amuri/reexports-before-local` | `export {} from` before local `export {}` |
| `amuri/as-const-upper-snake` | `as const` constants are `UPPER_SNAKE_CASE`; `UPPER_SNAKE_CASE` objects/arrays are `as const` (primitives need no `as const`) |
| `amuri/sorted-specifiers` | alphabetical order inside `import { }` / `export { }` (auto-fix) |
| `amuri/type-name-prefix` | interfaces are `IFoo`, type aliases are `TFoo`, enums are `EFoo`, generic parameters are `T` / `TFoo`; custom prefixes via option `{ interface: 'I', type: 'T', enum: 'E', generic: 'T' }` |
| `amuri/value-before-type` | value import/export before type one for the same path |

## Usage

```sh
npm i -D @amurisavemylifee/eslint-config eslint typescript-eslint eslint-plugin-import
```

`eslint.config.js`:

```js
import amuri from '@amurisavemylifee/eslint-config';

export default [...amuri];
```

Parts: `typescript`, `style` (import/export + custom rules), and the opt-in `typeAware`
(`consistent-type-exports`, needs a tsconfig covering the files):

```js
import amuri, { typeAware } from '@amurisavemylifee/eslint-config';

export default [...amuri, ...typeAware];
```

## Publish

Bump `version` in `package.json`, then push a tag; the `Publish` workflow runs tests and publishes
to npmjs.com (secret `NPM_TOKEN`, with provenance):

```sh
npm version patch   # creates commit + tag vX.Y.Z
git push --follow-tags
```
