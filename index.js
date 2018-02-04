const parse = require('comment-parser');
const path = require('path');
const fs = require('fs');

let imports, levelsUp, resourceDir;

function parseModules(type) {
  return type.match(/module\:[^ \|\}\>,=\n]+/g);
}

function formatImport(type) {
  const moduleType = type.trim();
  type = type.replace(/^module\:/, '');
  const pathParts = type.split('/');
  const name = pathParts.pop();
  const namedParts = name.split('.');
  let up = '';
  for (let i = 1; i < levelsUp; ++i) {
    up += '../';
  }
  const typePath = (up || './') + (pathParts.length > 0 ? pathParts.join('/') + '/' : '');

  function resolveTypedef() {
    const typedefFile = require.resolve(path.resolve(resourceDir, `${typePath}${namedParts[0]}`));
    const definedIn = fs.readFileSync(typedefFile, {encoding: 'utf-8'});
    const lines = definedIn.split('\n');
    const comments = parse(definedIn);
    let typedef, modulePath;
    comments.forEach(comment => {
      comment.tags.forEach(tag => {
        if (tag.tag == 'module') {
          modulePath = tag.name;
        } else if (tag.tag == 'typedef') {
          const name = getTypedefName(lines, tag);
          if (moduleType == `module:${modulePath}.${name}`) {
            typedef = [moduleType, tag.type.split('\n').join(' ').trim()];
          }
        }
      });
    });
    return typedef;
  }

  if (namedParts.length > 1) {
    const typedef = resolveTypedef();
    if (typedef) {
      return typedef;
    } else {
      return `const ${formatType(type)} = require('${typePath}${namedParts[0]}').${namedParts[1]};`;
    }
  } else {
    return `const ${formatType(type)} = require('${typePath}${namedParts[0]}');`;
  }
}

function formatType(type) {
  type = type.replace(/module\:/, '');
  const pathParts = type.split('/');
  const name = pathParts.pop();
  const namedParts = name.split('.');
  if (namedParts.length > 1) {
    return `${pathParts.join('_')}_${namedParts.join('_')}`;
  } else {
    return `${pathParts.join('$')}$${namedParts[0]}`;
  }
}

function getTypedefName(lines, tag) {
  let name = tag.name;
  if (!name) {
    let i = tag.line;
    while (lines[i].indexOf('*/') == -1) {
      ++i;
    }
    const match = lines[i + 1].match(/(let|var) ([^;]+)/);
    name = match[2];
  }
  return name;
}


module.exports = function(source) {
  resourceDir = path.dirname(this.resourcePath);
  imports = {};
  levelsUp = 0;
  let lines, modified;
  do {
    modified = false;
    lines = source.split('\n');
    const comments = parse(source);
    comments.forEach(comment => {
      comment.tags.forEach(tag => {
        if (tag.tag == 'module') {
          levelsUp = tag.name.split('/').length;
          if (path.basename(this.resourcePath) == 'index.js') {
            ++levelsUp;
          }
        } else {
          if (tag.type && tag.type.indexOf('module:') !== -1) {
            parseModules(tag.type).forEach(type => {
              const importLine = formatImport(type);
              if (Array.isArray(importLine)) {
                let i = tag.line;
                do {
                  lines[i] = lines[i].replace(importLine[0], importLine[1]);
                  ++i;
                } while (lines[i - 1].indexOf('*/') == -1);
                modified = true;
              } else {
                imports[importLine] = true;
                let i = tag.line;
                do {
                  lines[i] = lines[i].replace(type, formatType(type));
                  ++i;
                  modified = true;
                } while (lines[i - 1].indexOf('*/') == -1);
              }
            });
          }
        }
      });
    });
    source = lines.join('\n');
  } while (modified);
  lines[0] = Object.keys(imports).join(' ') + lines[0];
  return lines.join('\n');
};
