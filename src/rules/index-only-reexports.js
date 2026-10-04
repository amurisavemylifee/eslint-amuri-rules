// `index` files may only re-export — no logic.
//
// OK:    import { a } from './a'
// OK:    export { a } from './a'
// OK:    export * from './a'
// OK:    export type { T }
// OK:    'use client' (directive)
//
// WRONG: const a = 1
// WRONG: export function f() {}
// WRONG: export default ...
// WRONG: any other statement (calls, conditionals, declarations, ...)
const INDEX_FILE = /^index\.[cm]?[jt]sx?$/;

const isAllowed = (node) => {
  switch (node.type) {
    case 'ImportDeclaration':
    case 'ExportAllDeclaration':
      return true;
    case 'ExportNamedDeclaration':
      return !node.declaration;
    case 'ExpressionStatement':
      return typeof node.directive === 'string';
    default:
      return false;
  }
};

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      onlyReexports: 'index files may only contain imports and re-exports, move the logic to a separate module.',
    },
  },
  create(context) {
    const basename = (context.filename ?? context.getFilename()).split(/[\\/]/).pop();

    if (!INDEX_FILE.test(basename)) return {};

    return {
      Program(program) {
        for (const node of program.body) {
          if (!isAllowed(node)) context.report({ node, messageId: 'onlyReexports' });
        }
      },
    };
  },
};
