/**
 * sensitive-data.js
 * Detect and handle sensitive fields in JSON
 */
const SensitiveData = (() => {

  const SENSITIVE_PATTERNS = [
    { pattern: /password/i,   severity: 'high',   reason: 'Password field' },
    { pattern: /passwd/i,     severity: 'high',   reason: 'Password field' },
    { pattern: /secret/i,     severity: 'high',   reason: 'Secret / credential' },
    { pattern: /apikey/i,     severity: 'high',   reason: 'API key' },
    { pattern: /api_key/i,    severity: 'high',   reason: 'API key' },
    { pattern: /apiToken/i,   severity: 'high',   reason: 'API token' },
    { pattern: /access_token/i,severity:'high',   reason: 'Access token' },
    { pattern: /accessToken/i,severity: 'high',   reason: 'Access token' },
    { pattern: /auth_token/i, severity: 'high',   reason: 'Auth token' },
    { pattern: /authToken/i,  severity: 'high',   reason: 'Auth token' },
    { pattern: /bearer/i,     severity: 'high',   reason: 'Bearer token' },
    { pattern: /token/i,      severity: 'medium', reason: 'Token / credential' },
    { pattern: /private_key/i,severity: 'high',   reason: 'Private key' },
    { pattern: /privateKey/i, severity: 'high',   reason: 'Private key' },
    { pattern: /client_secret/i,severity:'high',  reason: 'OAuth client secret' },
    { pattern: /clientSecret/i, severity:'high',  reason: 'OAuth client secret' },
    { pattern: /credit_card/i,severity: 'high',   reason: 'Credit card number' },
    { pattern: /creditCard/i, severity: 'high',   reason: 'Credit card number' },
    { pattern: /card_number/i,severity: 'high',   reason: 'Card number' },
    { pattern: /cvv/i,        severity: 'high',   reason: 'Card CVV code' },
    { pattern: /ssn/i,        severity: 'high',   reason: 'Social Security Number' },
    { pattern: /social_security/i,severity:'high',reason: 'Social Security Number' },
    { pattern: /email/i,      severity: 'medium', reason: 'Email address (PII)' },
    { pattern: /phone/i,      severity: 'medium', reason: 'Phone number (PII)' },
    { pattern: /mobile/i,     severity: 'medium', reason: 'Mobile number (PII)' },
    { pattern: /address/i,    severity: 'low',    reason: 'Address field (PII)' },
    { pattern: /cookie/i,     severity: 'high',   reason: 'Cookie value' },
    { pattern: /session/i,    severity: 'medium', reason: 'Session identifier' },
    { pattern: /username/i,   severity: 'low',    reason: 'Username / login ID' },
    { pattern: /user_name/i,  severity: 'low',    reason: 'Username / login ID' },
    { pattern: /dob/i,        severity: 'medium', reason: 'Date of birth (PII)' },
    { pattern: /birth_date/i, severity: 'medium', reason: 'Date of birth (PII)' },
    { pattern: /national_id/i,severity: 'high',   reason: 'National ID number' },
    { pattern: /passport/i,   severity: 'high',   reason: 'Passport number' },
    { pattern: /license/i,    severity: 'medium', reason: 'License number (PII)' },
  ];

  /**
   * Scan JSON data for sensitive fields
   * Returns array of findings
   */
  function scan(data) {
    const findings = [];
    walk(data, '$', findings);
    // Sort by severity
    const order = { high: 0, medium: 1, low: 2 };
    findings.sort((a, b) => (order[a.severity] || 3) - (order[b.severity] || 3));
    return findings;
  }

  function walk(value, path, findings) {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`, findings));
      return;
    }
    for (const [key, val] of Object.entries(value)) {
      const keyPath = `${path}.${key}`;
      const match = SENSITIVE_PATTERNS.find(p => p.pattern.test(key));
      if (match) {
        findings.push({
          key,
          path: keyPath,
          value: val,
          severity: match.severity,
          reason: match.reason,
        });
      }
      if (val && typeof val === 'object') {
        walk(val, keyPath, findings);
      }
    }
  }

  /**
   * Mask sensitive fields in data
   */
  function mask(data, fields, maskChar = '***MASKED***') {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(item => mask(item, fields, maskChar));
    const result = {};
    for (const [k, v] of Object.entries(data)) {
      if (fields.includes(k)) {
        result[k] = maskChar;
      } else {
        result[k] = mask(v, fields, maskChar);
      }
    }
    return result;
  }

  function getSeverityColor(severity) {
    return { high: 'danger', medium: 'warning', low: 'info' }[severity] || 'neutral';
  }

  function formatValue(val) {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'string') {
      if (val.length > 80) return val.substring(0, 80) + '…';
      return val;
    }
    return JSON.stringify(val).substring(0, 80);
  }

  return { scan, mask, getSeverityColor, formatValue };
})();
