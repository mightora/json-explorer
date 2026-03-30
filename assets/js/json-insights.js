/**
 * json-insights.js
 * Generate metrics and insights from JSON data
 */
const JSONInsights = (() => {

  const TIMESTAMP_KEYS = ['timestamp', 'created', 'updated', 'date', 'time', 'at', 'modified', 'expires', 'issued', 'createdAt', 'updatedAt', 'deletedAt', 'publishedAt'];
  const ID_KEYS = ['id', '_id', 'uuid', 'guid', 'key', 'ref', 'identifier', 'userId', 'productId', 'orderId'];

  function analyse(data) {
    const metrics = {
      totalKeys: 0,
      totalArrays: 0,
      totalObjects: 0,
      totalValues: 0,
      nullCount: 0,
      emptyStringCount: 0,
      emptyArrayCount: 0,
      emptyObjectCount: 0,
      maxDepth: 0,
      typeDistribution: { string: 0, number: 0, boolean: 0, null: 0, object: 0, array: 0 },
      repeatedKeys: {},
      likelyTimestamps: [],
      likelyIds: [],
      largestArray: 0,
      stringLengths: [],
    };

    walk(data, '$', 0, metrics);

    // Find repeated keys (keys appearing more than once)
    metrics.repeatedKeys = Object.fromEntries(
      Object.entries(metrics.repeatedKeys).filter(([, v]) => v > 1)
    );

    // Compute string length stats
    if (metrics.stringLengths.length > 0) {
      metrics.avgStringLength = Math.round(metrics.stringLengths.reduce((a, b) => a + b, 0) / metrics.stringLengths.length);
      metrics.maxStringLength = Math.max(...metrics.stringLengths);
    }

    return metrics;
  }

  function walk(value, path, depth, metrics) {
    if (depth > metrics.maxDepth) metrics.maxDepth = depth;

    if (value === null) {
      metrics.nullCount++;
      metrics.typeDistribution.null++;
      metrics.totalValues++;
      return;
    }

    if (Array.isArray(value)) {
      metrics.totalArrays++;
      metrics.typeDistribution.array++;
      if (value.length === 0) metrics.emptyArrayCount++;
      if (value.length > metrics.largestArray) metrics.largestArray = value.length;
      value.forEach((item, i) => walk(item, `${path}[${i}]`, depth + 1, metrics));
      return;
    }

    if (typeof value === 'object') {
      metrics.totalObjects++;
      metrics.typeDistribution.object++;
      if (Object.keys(value).length === 0) metrics.emptyObjectCount++;
      for (const [k, v] of Object.entries(value)) {
        metrics.totalKeys++;
        // Track key frequency
        metrics.repeatedKeys[k] = (metrics.repeatedKeys[k] || 0) + 1;
        // Detect timestamps
        if (TIMESTAMP_KEYS.some(tk => k.toLowerCase().includes(tk.toLowerCase()))) {
          metrics.likelyTimestamps.push({ path: `${path}.${k}`, key: k, value: v });
        }
        // Detect IDs
        if (ID_KEYS.some(ik => k.toLowerCase() === ik.toLowerCase())) {
          metrics.likelyIds.push({ path: `${path}.${k}`, key: k, value: v });
        }
        walk(v, `${path}.${k}`, depth + 1, metrics);
      }
      return;
    }

    // Primitive
    metrics.totalValues++;
    const t = typeof value;
    metrics.typeDistribution[t] = (metrics.typeDistribution[t] || 0) + 1;
    if (t === 'string') {
      if (value === '') metrics.emptyStringCount++;
      metrics.stringLengths.push(value.length);
    }
  }

  function getTypeChartData(metrics) {
    const { typeDistribution: td } = metrics;
    const labels = [];
    const values = [];
    const colors = {
      string:  '#2d6a4f',
      number:  '#e76f51',
      boolean: '#7b2d8b',
      null:    '#94a3b8',
      object:  '#4361ee',
      array:   '#0096c7',
    };
    for (const [type, count] of Object.entries(td)) {
      if (count > 0) { labels.push(type); values.push(count); }
    }
    return { labels, values, colors: labels.map(l => colors[l] || '#999') };
  }

  function getTopRepeatedKeys(metrics, limit = 10) {
    return Object.entries(metrics.repeatedKeys)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => ({ key, count }));
  }

  return { analyse, getTypeChartData, getTopRepeatedKeys };
})();
