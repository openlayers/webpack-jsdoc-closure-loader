# webpack-jsdoc-closure-loader

A webpack loader that converts JSDoc types from [namepaths](http://usejsdoc.org/about-namepaths.html) with [module identifiers](http://usejsdoc.org/howto-commonjs-modules.html#module-identifiers) to  types for Closure Compiler.

This is useful for type checking and building a set of ES modules with Closure Compiler, e.g. through  the [webpack-closure-compiler](https://www.npmjs.com/package/webpack-closure-compiler) plugin.


## Install

    $ npm install --save-dev webpack-jsdoc-closure-loader


## Configure webpack

Add the loader to the `modules` section of your webpack configuration:

```js
module: {
  rules: [{
    test: /\.js$/,
    loaders: ['webpack-jsdoc-closure-loader'],
    exclude: /node_modules/
  }]
},
```


## Preparing your js source files

Each file needs a `@module` JSDoc annotation with the path and name at the top of the file. If you have a file `src/foo/bar.js` and `src` is the package root, use the following annotation:

```js
/** @module foo/bar */
```


## Using types from a different module

Define the type using a JSDoc [module identifiers](http://usejsdoc.org/howto-commonjs-modules.html#module-identifiers), e.g.

```js
/** @type {module:foo/bar.mytype} */
const foo = {
  bar: 'baz'
};
```

The type used above is defined in `src/foo/bar.js` like this:

```js
/** @typedef {{bar: string}} */
export let mytype;
```

or

```js
/** @typedef {{bar: string}} mytype */
```


## What the loader does

### Inlining of `@typedef`s

Since typedefs are just shorthands for complex types in Closure Compiler, they can be inlined wherever they are used. In the above example, the result that the compiler sees will be

```js
/** @type {{bar: string}} */
const foo = {
  bar: 'baz'
};
```

### Import types from module identifiers

When bundling your application, webpack will import types from other files. Let's say you have a file `foo/Bar.js` with the following:

```js
/** @module foo/Bar */

/**
 * @constructor
 * @param {string} name Name.
 */
const Bar = function(name) {
  this.name = name;
};
export default Person;
```

Then you can use this in another module with

```js
/**
 * @param {module:foo/Bar} bar Bar.
 */
function foo(bar) {}
```

The bundler will get something like

```js
const foo$Bar = require('./foo/Bar');
/**
 * @param {foo$Bar} bar Bar.
 */
function foo(bar) {}
```

With this, the type definition is made available to the module that uses the type.

### Locally repeat `@enum`s

Closure Compiler does not recognize imported enums, so these are repeated locally. If module `types` specifies

```js
/** @enum {number} */
export const Foo = {
  BAR: 1,
  BAZ: 2
};
```

and another module uses

```js
/** @type {module:types.Foo} */
const foo;
```

the bundler will get something like

```js
/** @enum {number} */ const _types_Foo = { BAR: 1, BAZ: 2 };
/** @type {_types_Foo} */
const foo;
```
