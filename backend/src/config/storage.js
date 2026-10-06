const path = require('node:path');

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const configuredMaxSize = Number(process.env.UPLOAD_MAX_SIZE_BYTES);

module.exports = {
  uploadDirectory: path.resolve(
    process.env.UPLOAD_DIR || path.join(__dirname, '../../storage')
  ),
  maxFileSizeBytes: Number.isSafeInteger(configuredMaxSize) && configuredMaxSize > 0
    ? configuredMaxSize
    : DEFAULT_MAX_SIZE_BYTES
};