// Import through the most specific (shortest) alias that covers the path.
// Aliases are an option: { aliases: { '@': 'src', '@components': 'src/components', '@trpc': 'src/server/api/trpc' } }
// (targets are relative to cwd). Only aliased specifiers are checked, relative paths are left alone.
// Auto-fix rewrites the specifier.
//
// ❌ import { Button } from '@/components/Button';       ← @components covers it
// ❌ import { trpc } from '@/server/api/trpc';           ← @trpc is that very folder
// ✅ import { Button } from '@components/Button';
// ✅ import { trpc } from '@trpc';
// ✅ import { env } from '@/env';                        ← no deeper alias covers it
import { relative, resolve, sep } from 'node:path';

const isInside = (path, dir) => path === dir || path.startsWith(dir + sep);

export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: { aliases: { type: 'object', additionalProperties: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      shortAlias: "'{{path}}' can use the shorter alias: '{{short}}'.",
    },
  },
  create(context) {
    const cwd = context.cwd ?? process.cwd();
    const aliases = Object.entries(context.options[0]?.aliases ?? {}).map(([prefix, target]) => ({
      prefix: prefix.replace(/\/+$/, ''),
      dir: resolve(cwd, target),
    }));

    if (aliases.length === 0) return {};

    const check = (node) => {
      const path = node.source?.value;

      if (typeof path !== 'string') return;

      // longest alias name wins, so `@` matches `@/x`, not `@foo`
      const current = aliases
        .filter(({ prefix }) => path === prefix || path.startsWith(prefix + '/'))
        .sort((a, b) => b.prefix.length - a.prefix.length)[0];

      if (!current) return;

      const target = resolve(current.dir, path.slice(current.prefix.length + 1));
      const best = aliases
        .filter(({ dir }) => isInside(target, dir))
        .sort((a, b) => b.dir.length - a.dir.length)[0];

      if (!best || best.dir.length <= current.dir.length) return;

      const rest = relative(best.dir, target).split(sep).join('/');
      const short = rest ? `${best.prefix}/${rest}` : best.prefix;
      const quote = node.source.raw[0];

      context.report({
        node: node.source,
        messageId: 'shortAlias',
        data: { path, short },
        fix: (fixer) => fixer.replaceText(node.source, `${quote}${short}${quote}`),
      });
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
