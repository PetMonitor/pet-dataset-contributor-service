const express = require('express');
let router = express.Router();

const uploadController = require('../controllers/upload');

/** Upload routes */
router.post('/', uploadController.uploadFilesToDrive);

module.exports = router;
