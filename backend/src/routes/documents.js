const express = require('express');
const documentsController = require('../controllers/documentsController');
const upload = require('../middleware/upload');

const router = express.Router();

router.post(
  '/upload',
  documentsController.requireOwner,
  upload.single('file'),
  documentsController.uploadDocument
);
router.get('/documents', documentsController.requireOwner, documentsController.listDocuments);
router.get(
  '/documents/:id/download',
  documentsController.requireOwner,
  documentsController.downloadDocument
);

module.exports = router;