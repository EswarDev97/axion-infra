#!/usr/bin/env node
/**
 * AICodePath Privacy Filter
 *
 * Filters credentials and sensitive data from text before storing in memory,
 * logs, or any persistent storage. Prevents leakage into cross-session
 * learning systems (reflexion-learner, knowledge.md, etc.).
 *
 * @module lib/privacy-filter
 */

const logger = require('./logger');

/**
 * Regex patterns that identify credentials in text.
 * Each pattern replaces the matched value with [REDACTED].
 */
const CREDENTIAL_PATTERNS = [
  // Generic key=value credentials
  /(?:password|passwd|pwd|api[_-]?key|apikey|token|credential|auth[_-]?token|access[_-]?token)\s*[:=]\s*["'][^"']{4,}["']/gi,
  // PEM private keys
  /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/g,
  // OpenAI / Anthropic / GitHub / GitLab API keys
  /sk-[a-zA-Z0-9]{20,}/g,
  /sk-ant-[a-zA-Z0-9\-_]{20,}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /glpat-[a-zA-Z0-9\-]{20,}/g,
  // AWS access keys
  /AKIA[0-9A-Z]{16}/g,
  // JWT tokens (three base64url segments)
  /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
  // Connection strings with embedded credentials
  /(?:mongodb|postgresql|mysql|redis|amqp):\/\/[^:]+:[^@]+@/gi,
];

/**
 * File path patterns that should be treated as credential files.
 * Content from these files should never be stored in memory.
 */
const CREDENTIAL_FILE_PATTERN = /(?:^|[\\/])(?:\.env(?:\.[^/\\]*)?$|id_rsa|id_ed25519|authorized_keys|known_hosts|.*\.pem$|.*\.key$|.*\.p12$|.*\.pfx$|credentials[\\/])/i;

/**
 * Replace all detected credential patterns with [REDACTED].
 *
 * @param {string} text - Input text that may contain credentials
 * @returns {string} Text with credentials replaced
 */
function filterCredentials(text) {
  if (!text || typeof text !== 'string') return text;

  let filtered = text;
  let redactCount = 0;

  for (const pattern of CREDENTIAL_PATTERNS) {
    pattern.lastIndex = 0;
    const before = filtered;
    filtered = filtered.replace(pattern, '[REDACTED]');
    if (filtered !== before) redactCount++;
  }

  if (redactCount > 0) {
    logger.info('Privacy filter applied', { context: 'privacy-filter', redactedCount: redactCount });
  }

  return filtered;
}

/**
 * Check whether a file path refers to a credential file.
 * Use this before reading/storing file content.
 *
 * @param {string} filePath - File path to check
 * @returns {boolean} True if the file should be treated as sensitive
 */
function isCredentialFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  return CREDENTIAL_FILE_PATTERN.test(filePath);
}

/**
 * Sanitize an object's string values for safe storage.
 * Recurses into nested objects and arrays.
 *
 * @param {*} data - Data to sanitize
 * @returns {*} Sanitized copy
 */
function sanitize(data) {
  if (typeof data === 'string') return filterCredentials(data);
  if (Array.isArray(data)) return data.map(sanitize);
  if (data && typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitize(value);
    }
    return result;
  }
  return data;
}

// Keep filterSecrets as alias for backward compatibility
const filterSecrets = filterCredentials;
const isSecretFile = isCredentialFile;

module.exports = {
  filterCredentials,
  filterSecrets,
  isCredentialFile,
  isSecretFile,
  sanitize,
  CREDENTIAL_PATTERNS,
  CREDENTIAL_FILE_PATTERN,
};
