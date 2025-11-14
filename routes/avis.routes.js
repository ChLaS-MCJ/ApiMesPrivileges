const express = require('express');
const router = express.Router();
const avisController = require('../controllers/avis.controllers');
const { authMiddleware, isClient, isAdmin } = require('../middlewares/auth.middleware');
const { validateAvis } = require('../middlewares/validation.middleware');

// PUBLIC
router.get('/prestataire/:prestataireId', avisController.getByPrestataire);

// CLIENT
router.post('/', authMiddleware, isClient, validateAvis, avisController.create);
router.get('/me', authMiddleware, isClient, avisController.getMine);

// ADMIN
router.delete('/:id', authMiddleware, isAdmin, avisController.delete);

module.exports = router;