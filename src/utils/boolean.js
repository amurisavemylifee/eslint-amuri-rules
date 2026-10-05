import ts from 'typescript';

const PREFIXES = ['is', 'has', 'can', 'should', 'will', 'did', 'does', 'are', 'was', 'were'];
const NULLISH = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void;

/** `boolean` / `true` / `false`, optionally with `null` / `undefined`. */
const isBooleanType = (type) => {
  const parts = (type.isUnion() ? type.types : [type]).filter((part) => (part.flags & NULLISH) === 0);

  return parts.length > 0 && parts.every((part) => (part.flags & ts.TypeFlags.BooleanLike) !== 0);
};

const PREFIXES_SCHEMA = [
  {
    type: 'object',
    properties: { prefixes: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1, uniqueItems: true } },
    additionalProperties: false,
  },
];

/** Prefix matcher for the rule's `{ prefixes }` option (defaults to the built-in list). */
const createBooleanPrefixes = (options) => {
  const list = options?.prefixes ?? PREFIXES;
  const camel = new RegExp(`^_*(?:${list.join('|')})(?:[A-Z0-9]|$)`);
  const upper = new RegExp(`^_*(?:${list.join('|').toUpperCase()})(?:_|$)`);
  const [first] = list;

  return {
    list: list.join(', '),
    has: (name) => camel.test(name) || upper.test(name),
    hint: (name) => {
      const bare = name.replace(/^_+/, '');

      return /^[A-Z0-9_]+$/.test(bare)
        ? `${first.toUpperCase()}_${bare}`
        : `${first}${bare[0].toUpperCase()}${bare.slice(1)}`;
    },
  };
};

export { createBooleanPrefixes, isBooleanType, PREFIXES_SCHEMA };
