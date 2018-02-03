/**
 * @module types
 */

/**
 * @typedef {{
 *   foo: string,
 *   bar: module:types.type2
 * }}
 */
let type1;

/**
 * @typedef {Array<number>}
 */
let type2;

module.exports = {
  type1, type2
};
