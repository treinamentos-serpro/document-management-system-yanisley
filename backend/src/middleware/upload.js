const fs = require('node:fs');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const { uploadDirectory, maxFileSizeBytes } = require('../config/storage');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(uploadDirectory, { recursive: true }, (error) => {
      callback(error, uploadDirectory);
    });
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  }
});

module.exports = multer({
  storage,
  limits: { fileSize: maxFileSizeBytes, files: 1 }
});