const express = require('express');
const router = express.Router();
const linksCtrl = require('../controllers/links');

// POST /links
router.post('/', linksCtrl.createShortLink);

module.exports = router;
