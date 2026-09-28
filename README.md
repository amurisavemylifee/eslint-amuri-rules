# @amurisavemylifee/eslint-config

Shared ESLint flat config (ESLint 9): TypeScript, Vue, import/export layout, plus 7 custom rules
(plugin `amuri`, taken from `gta-rp-server`, branch `refactor/architecture`).

| Custom rule | What it does |
| --- | --- |
| `amuri/curly-except-return` | braces on every `if` body except bare `return;` |
| `amuri/no-inline-export` | no `export const/function/...`, use `export { }` blocks |
| `amuri/adjacent-same-path` | imports/re-exports from one path stay adjacent |
| `amuri/no-duplicate-same-kind` | one `import {}` + one `import type {}` per module (replaces `import/no-duplicates`) |
| `amuri/no-inline-type-specifier` | `import type { A }` instead of `import { type A }` |
| `amuri/reexports-before-local` | `export {} from` before local `export {}` |
| `amuri/value-before-type` | value import/export before type one for the same path |

## Usage

`.npmrc` in the consuming project (GitHub Packages, after publishing):

```
@amurisavemylifee:registry=https://npm.pkg.github.com
```

```sh
npm i -D @amurisavemylifee/eslint-config eslint typescript-eslint eslint-plugin-vue eslint-plugin-import vue-eslint-parser
```

`eslint.config.js`:

```js
import amuri from '@amurisavemylifee/eslint-config';

export default [...amuri];
```

Parts: `typescript`, `vue`, `style` (import/export + custom rules), and the opt-in `typeAware`
(`consistent-type-exports`, needs a tsconfig covering the files):

```js
import amuri, { typeAware } from '@amurisavemylifee/eslint-config';

export default [...amuri, ...typeAware];
```

## Publish

```sh
npm publish   # needs a token with write:packages
```
