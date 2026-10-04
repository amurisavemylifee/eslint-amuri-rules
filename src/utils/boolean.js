import ts from 'typescript';

const PREFIXES = ['is', 'has', 'can', 'should', 'will', 'did', 'does', 'are', 'was', 'were'];
const PREFIXED = new RegExp(`^_*(?:${PREFIXES.join('|')})(?:[A-Z0-9]|$)`);
const PREFIXED_UPPER = new RegExp(`^_*(?:${PREFIXES.join('|').toUpperCase()})(?:_|$)`);
const NULLISH = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void;

/** `boolean` / `true` / `false`, optionally with `null` / `undefined`. */
const isBooleanType = (type) => {
  const parts = (type.isUnion() ? type.types : [type]).filter((part) => (part.flags & NULLISH) === 0);

  return parts.length > 0 && parts.every((part) => (part.flags & ts.TypeFlags.BooleanLike) !== 0);
};

const hasBooleanPrefix = (name) => PREFIXED.test(name) || PREFIXED_UPPER.test(name);

const booleanHint = (name) => {
  const bare = name.replace(/^_+/, '');

  return /^[A-Z0-9_]+$/.test(bare) ? `IS_${bare}` : `is${bare[0].toUpperCase()}${bare.slice(1)}`;
};

const PREFIX_LIST = PREFIXES.join(', ');

export { booleanHint, hasBooleanPrefix, isBooleanType, PREFIX_LIST };
