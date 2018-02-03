const assert = require('assert');
const loader = require('../index');

describe('webpack-jsdoc-closure-loader', function() {

  it('parses module in a type', function() {
    const source =
      '/** @module module2/types */\n' +
      '/** @type {module:module1/Bar} */\n';
    const context = {
      context: './test/module2/',
      resourcePath: './test/module2/types.js'
    };
    const got = loader.call(context, source);
    const expected =
      '/** @module module2/types */\n' +
      '/** @type {module1$Bar} */\n\n' +
      'const module1$Bar = require(\'../module1/Bar\');';
    assert.equal(got, expected);
  });

  it('parses a named export from a module in a type', function() {
    const source =
      '/** @module module2/types */\n' +
      '/** @type {module:types.foo} */\n';
    const context = {
      context: './test/module2/',
      resourcePath: './test/module2/types.js'
    };
    const got = loader.call(context, source);
    const expected =
      '/** @module module2/types */\n' +
      '/** @type {_types_foo} */\n\n' +
      'const _types_foo = require(\'../types\').foo;';
    assert.equal(got, expected);
  });

  it('resolves path correctly for index.js files', function() {
    const source =
      '/** @module module2/types */\n' +
      '/** @type {module:module1/Bar} */\n';
    const context = {
      context: './test/module2/types/',
      resourcePath: './test/module2/types/index.js'
    };
    const got = loader.call(context, source);
    const expected =
      '/** @module module2/types */\n' +
      '/** @type {module1$Bar} */\n\n' +
      'const module1$Bar = require(\'../../module1/Bar\');';
    assert.equal(got, expected);
  });

  it('parses module in a compound type', function() {
    const source =
      '/** @module module2/types */\n' +
      '/** @type {module:module1/Bar|string} */\n';
    const context = {
      context: './test/module2/',
      resourcePath: './test/module2/types.js'
    };
    const got = loader.call(context, source);
    const expected =
      '/** @module module2/types */\n' +
      '/** @type {module1$Bar|string} */\n\n' +
      'const module1$Bar = require(\'../module1/Bar\');';
    assert.equal(got, expected);
  });

  it('parses module in a nested type', function() {
    const source =
      '/** @module module2/types */\n' +
      '/** @type {Object<string, module:module1/Bar>} */\n';
    const context = {
      context: './test/module2/',
      resourcePath: './test/module2/types.js'
    };
    const got = loader.call(context, source);
    const expected =
      '/** @module module2/types */\n' +
      '/** @type {Object<string, module1$Bar>} */\n\n' +
      'const module1$Bar = require(\'../module1/Bar\');';
    assert.equal(got, expected);
  });

  it('parses module in an optional param', function() {
    const source =
      '/** @module module2/types */\n' +
      '/** @param {module:module1/Bar=} */\n';
    const context = {
      context: './test/module2/',
      resourcePath: './test/module2/types.js'
    };
    const got = loader.call(context, source);
    const expected =
      '/** @module module2/types */\n' +
      '/** @param {module1$Bar=} */\n\n' +
      'const module1$Bar = require(\'../module1/Bar\');';
    assert.equal(got, expected);
  });

  it('parses module in a non nullable param', function() {
    const source =
      '/** @module module2/types */\n' +
      '/** @param {!module:module1/Bar} */\n';
    const context = {
      context: './test/module2/',
      resourcePath: './test/module2/types.js'
    };
    const got = loader.call(context, source);
    const expected =
      '/** @module module2/types */\n' +
      '/** @param {!module1$Bar} */\n\n' +
      'const module1$Bar = require(\'../module1/Bar\');';
    assert.equal(got, expected);
  });

  it('inlines typedefs', function() {
    const source =
      '/** @module module2/types */\n' +
      '/** @type {module:types.type1} */\n';
    const context = {
      context: './test/module2/',
      resourcePath: './test/module2/types.js'
    };
    const got = loader.call(context, source);
    const expected =
      '/** @module module2/types */\n' +
      '/** @type {{ foo: string, bar: Array<number> }} */\n\n';
    assert.equal(got, expected);
  });

});