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

  function loadForeignType() {
    const typedefFile = require.resolve(path.resolve(resourceDir, `${typePath}${namedParts[0]}`));
    const definedIn = fs.readFileSync(typedefFile, {encoding: 'utf-8'});
    const lines = definedIn.split('\n');
    const comments = parse(definedIn);
    let enumdef, typedef, modulePath;
    comments.forEach(comment => {
      comment.tags.forEach(tag => {
        if (tag.tag == 'module') {
          modulePath = tag.name;
        } else if (tag.tag == 'typedef' || tag.tag == 'enum') {
          const name = getName(lines, tag);
          if (moduleType == `module:${modulePath}.${name}`) {
            if (tag.tag == 'typedef') {
              typedef = [moduleType, tag.type.split('\n').join(' ').trim()];
            } else if (tag.tag == 'enum') {
              enumdef = getEnum(lines, tag.line);
            }
          }
        }
      });
    });
    return [enumdef, typedef];
  }

  if (namedParts.length > 1) {
    const [enumdef, typedef] = loadForeignType();
    if (typedef) {
      return typedef;
    } else if (enumdef) {
      return `${enumdef.replace('${name}', formatType(type))}; ${formatType(type)} = require('${typePath}${namedParts[0]}').${namedParts[1]};`;
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

function getName(lines, tag) {
  let name = tag.name;
  if (!name) {
    let i = tag.line;
    while (lines[i].indexOf('*/') == -1) {
      ++i;
    }
    const match = lines[i + 1].match(/(let|var|const) ([^; ]+)/);
    name = match[2];
  }
  return name;
}

function getEnum(lines, i) {
  while (lines[i].indexOf('/**') == -1) {
    --i;
  }
  const comment = [lines[i].substr(lines[i].indexOf('/**'))];
  let line = lines[i].trim();
  while (lines[i].indexOf('*/') == -1) {
    ++i;
    line = lines[i].trim();
    comment.push(line);
  }
  comment[comment.length - 1] = line.substr(0, line.indexOf('*/') + 2);
  const definition = [line.substr(line.indexOf('*/'))];
  let match;
  while (!(match = definition.join(' ').match(/\{([\S\s]*)\}/))) {
    ++i;
    definition.push(lines[i].trim());
  }
  return comment.join(' ') + ` let \${name} = {${match[1]}}`;
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
                // typedef
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
