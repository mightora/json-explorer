/**
 * json-transform.js
 * JSON transformation operations
 */
const JSONTransform = (() => {

  function prettyPrint(data, indent = 2) {
    return JSON.stringify(data, null, indent);
  }

  function minify(data) {
    return JSON.stringify(data);
  }

  function sortKeys(data) {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(sortKeys);
    const sorted = {};
    Object.keys(data).sort().forEach(k => { sorted[k] = sortKeys(data[k]); });
    return sorted;
  }

  function removeNulls(data) {
    if (data === null) return undefined;
    if (Array.isArray(data)) return data.map(removeNulls).filter(v => v !== undefined);
    if (typeof data === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(data)) {
        const transformed = removeNulls(v);
        if (transformed !== undefined) result[k] = transformed;
      }
      return result;
    }
    return data;
  }

  function removeEmpty(data) {
    if (Array.isArray(data)) {
      const filtered = data.map(removeEmpty).filter(v => !isEmpty(v));
      return filtered;
    }
    if (data && typeof data === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(data)) {
        const transformed = removeEmpty(v);
        if (!isEmpty(transformed)) result[k] = transformed;
      }
      return result;
    }
    return data;
  }

  function isEmpty(v) {
    if (v === null || v === undefined || v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return true;
    return false;
  }

  function flatten(data, prefix = '', result = {}) {
    if (data === null || typeof data !== 'object') {
      result[prefix || 'value'] = data;
      return result;
    }
    if (Array.isArray(data)) {
      data.forEach((item, i) => flatten(item, prefix ? `${prefix}[${i}]` : `[${i}]`, result));
    } else {
      for (const [k, v] of Object.entries(data)) {
        const key = prefix ? `${prefix}.${k}` : k;
        flatten(v, key, result);
      }
    }
    return result;
  }

  function unflatten(flat) {
    const result = {};
    for (const [key, value] of Object.entries(flat)) {
      setPath(result, key, value);
    }
    return result;
  }

  function setPath(obj, path, value) {
    const parts = [];
    const re = /([^.[\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
      parts.push(m[1] !== undefined ? m[1] : parseInt(m[2]));
    }
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      if (current[part] === undefined) {
        current[part] = typeof nextPart === 'number' ? [] : {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  function parseEscaped(str) {
    // str is a JSON string that may contain escaped JSON
    try {
      // Try to parse as JSON string literal
      let unescaped = str;
      if (str.startsWith('"') && str.endsWith('"')) {
        unescaped = JSON.parse(str);
      }
      return JSON.parse(unescaped);
    } catch (_) {
      // Try removing outer quotes and unescaping manually
      const inner = str.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      return JSON.parse(inner);
    }
  }

  function extractSubtree(data, path) {
    return JSONParser.getByPath(data, path);
  }

  function renameKeys(data, renameMap) {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(item => renameKeys(item, renameMap));
    const result = {};
    for (const [k, v] of Object.entries(data)) {
      const newKey = renameMap[k] || k;
      result[newKey] = renameKeys(v, renameMap);
    }
    return result;
  }

  function maskFields(data, fields, maskChar = '***') {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(item => maskFields(item, fields, maskChar));
    const result = {};
    for (const [k, v] of Object.entries(data)) {
      if (fields.includes(k.toLowerCase())) {
        result[k] = maskChar;
      } else {
        result[k] = maskFields(v, fields, maskChar);
      }
    }
    return result;
  }

  return {
    prettyPrint,
    minify,
    sortKeys,
    removeNulls,
    removeEmpty,
    flatten,
    unflatten,
    parseEscaped,
    extractSubtree,
    renameKeys,
    maskFields
  };
})();
