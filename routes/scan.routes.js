const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scan.controllers');
const { authMiddleware, isPrestataire, isClient } = require('../middlewares/auth.middleware');
const { validateScan } = require('../middlewares/validation.middleware');

// CLIENT
router.get('/me', authMiddleware, isClient, scanController.getMyScans);
router.get('/me/stats', authMiddleware, isClient, scanController.getMyStats);

// PRESTATAIRE - Scanner le QR code
router.post('/scan', authMiddleware, isPrestataire, validateScan, scanController.scanQrCode);
router.get('/history', authMiddleware, isPrestataire, scanController.getHistory);

module.exports = router;