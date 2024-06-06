const Escaped = { '<': '&lt;', '>': '&gt;', '&': '&amp;' };
function html(strs, ...exprs) {
  let text = strs[0];
  for (let i = 0; i < strs.length - 1; i++) {
    text += (exprs[i] + '').replace(/[>&<]/g, match => Escaped[match]) + strs[i + 1];
  }
  return text;
}

function isFormattedLike(object) {
  return object && 'text' in other && 'entities' in other && Array.isArray(entities);
}

class FormattedString {
  constructor(...vals) {
    this.text = '';
    this.entities = [];
    this.append(...vals);
  }
  static join(vals, sep) {
    const result = new FormattedString();
    for (let i = 0; i < vals.length; i++) {
      i > 0 && result.append(sep);
      result.append(vals[i]);
    }
    return result;
  }
  append(...others) {
    // We can append other FormattedStrings, strings, or nested arrays of them
    for (let other of others) {
      if (Array.isArray(other)) {
        // Flatten all nested arrays
        this.append(...other);
      } else
      if (isFormattedLike(other)) {
        // FormattedString or something similar; merge entities
        const len = this.text.length;
        this.text += other.text;
        for (let entity of other.entities) {
          this.entities.push(Object.assign({}, entity, {
            offset: entity.offset + len,
          }));
        }
      } else {
        // Just stringify
        this.text += String(other);
      }
    }
    return this;
  }
  concat(...others) {
    return (new FormattedString(this)).append(...others);
  }
  substring(st, en) {
    // Normalize args
    st = st < 0 || isNaN(st) ? 0 : Math.min(st, this.text.length);
    en = en === undefined ? this.text.length : (en < 0 || isNaN(en) ? 0 : Math.min(en, this.text.length));
    if (st > en) {
      [st, en] = [en, st];
    }

    const result = new FormattedString(this.text.substring(st, en));
    result.entities = this.entities.filter(entity => {
      return entity.offset - st < result.text.length && entity.offset + entity.length - st > 0;
    }).map(entity => {
      return Object.assign({}, entity, {
        offset: Math.max(entity.offset - st, 0),
        length: Math.min(entity.length, result.text.length - (entity.offset - st)),
      });
    });
    return result;
  }
  slice(st, en) {
    const length = this.text.length;
    st = Math.max(0, Math.min(st < 0 ? st + length : st, length));
    en = en === undefined ? length : Math.max(0, Math.min(en < 0 ? en + length : en, length));
    return st < en ? this.substring(st, en) : new FormattedString();
  }
  toObject(textField, entitiesField) {
    // Simple helper for renaming text/entities while destructuring, e.g.:
    // const msg = { ...fmt`Hello world`.toObject('photo', 'photo_entities') }
    return {
      [textField]: this.text,
      [entitiesField]: this.entities,
    };
  }

  // TODO: padStart, padEnd, replace, replaceAll, split, trim, trimStart, trimEnd
}

for (const method of ['charAt', 'charCodeAt', 'codePointAt', 'endsWith', 'includes', 'indexOf',
  'isWellFormed', 'lastIndexOf', 'localeCompare', 'match', 'matchAll', 'normalize',
  'search', 'startsWith', 'toWellFormed']) {
  // Lift some methods from String class
  FormattedString.prototype[method] = function() {
    return this.text[method].apply(this.text, arguments);
  }
}
for (const method of ['toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toUpperCase']) {
  FormattedString.prototype[method] = function() {
    const result = new FormattedString(this.text[method].apply(this.text, arguments));
    result.entities = this.entities.map(entity => Object.assign({}, entity));
    return result;
  }
}

function fmt(strs, ...exprs) {
  // Use with tagged template literals: fmt`First name: ${[firstName, 'bold']}, last: ${lastName}`
  const builder = new FormattedString(strs[0]);
  for (let i = 0; i < strs.length - 1; i++) {
    const expr = exprs[i];
    if (Array.isArray(expr)) {
      // Format segment
      const offset = builder.text.length;
      let j = 0, k = builder.entities.length;
      do {
        // Always append first element and all FormattedStrings/Arrays
        builder.append(expr[j++]);
      } while (isFormattedLike(expr[j]) || Array.isArray(expr[j]));
      const length = builder.text.length - offset;
      for (; length && j < expr.length; j++, k++) {
        // Rest describes either entity types, or full entities (falsy values are filtered out)
        expr[j] && builder.entities.splice(k, 0, typeof expr[j] == 'string' ?
          { type: expr[j], offset, length } :
          Object.assign(expr[j], { offset, length })
        );
      }
    } else {
      builder.append(expr);
    }
    builder.text += strs[i + 1];
  }
  return builder;
}

module.exports = { fmt, html, FormattedString };