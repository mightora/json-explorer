/**
 * jwt-helper.js
 * Decode and display JWT tokens found in JSON values
 */
const JWTHelper = (() => {

  function isJWT(str) {
    if (typeof str !== 'string') return false;
    const parts = str.trim().split('.');
    return parts.length === 3 && parts.every(p => p.length > 0);
  }

  function decode(token) {
    const parts = token.trim().split('.');
    if (parts.length !== 3) throw new Error('Not a valid JWT format');

    try {
      const header  = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      const signature = parts[2];
      return { header, payload, signature, raw: { header: parts[0], payload: parts[1], signature: parts[2] } };
    } catch (e) {
      throw new Error('Failed to decode JWT: ' + e.message);
    }
  }

  function base64UrlDecode(str) {
    // Convert base64url to base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Pad
    while (base64.length % 4 !== 0) base64 += '=';
    return atob(base64);
  }

  function getExpiry(payload) {
    if (!payload.exp) return null;
    const date = new Date(payload.exp * 1000);
    const now = Date.now();
    return {
      date,
      formatted: date.toLocaleString(),
      expired: date.getTime() < now,
      expiresIn: Math.round((date.getTime() - now) / 1000 / 60), // minutes
    };
  }

  function getIssuedAt(payload) {
    if (!payload.iat) return null;
    const date = new Date(payload.iat * 1000);
    return { date, formatted: date.toLocaleString() };
  }

  /**
   * Scan JSON for JWT strings
   * Returns array of { path, value }
   */
  function scanForJWTs(data) {
    const found = [];
    walkForJWTs(data, '$', found);
    return found;
  }

  function walkForJWTs(value, path, found) {
    if (typeof value === 'string' && isJWT(value)) {
      found.push({ path, value });
      return;
    }
    if (value && typeof value === 'object') {
      const entries = Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value);
      entries.forEach(([k, v]) => walkForJWTs(v, Array.isArray(value) ? `${path}[${k}]` : `${path}.${k}`, found));
    }
  }

  return { isJWT, decode, getExpiry, getIssuedAt, scanForJWTs };
})();
