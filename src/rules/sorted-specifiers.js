// Specifiers inside `import { }` and `export { }` must be sorted alphabetically
// (case-insensitive, by the imported / local name).
//
// WRONG: import { b, a } from './m'
// WRONG: export { b, a }
// WRONG: export type { TB, TA } from './m'
//
// OK:    import { a, b } from './m'
// OK:    export { a, b }
//
// Auto-fix: reorders the specifiers in place.
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      unsorted: 'Specifiers must be sorted alphabetically (expected: {{expected}}).',
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    const nameOf = (id) => (id.type === 'Identifier' ? id.name : String(id.value));

    const keyOf = (spec) => nameOf(spec.type === 'ImportSpecifier' ? spec.imported : spec.local);

    const compare = (a, b) => {
      const x = keyOf(a).toLowerCase();
      const y = keyOf(b).toLowerCase();

      if (x !== y) return x < y ? -1 : 1;

      return keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0;
    };

    function check(node) {
      const specs = node.specifiers.filter(
        (s) => s.type === 'ImportSpecifier' || s.type === 'ExportSpecifier',
      );

      if (specs.length < 2) return;

      const sorted = [...specs].sort(compare);

      if (sorted.every((s, i) => s === specs[i])) return;

      context.report({
        node,
        messageId: 'unsorted',
        data: { expected: sorted.map(keyOf).join(', ') },
        fix(fixer) {
          return specs.map((spec, i) => fixer.replaceText(spec, src.getText(sorted[i])));
        },
      });
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
    };
  },
};
