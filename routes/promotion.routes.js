const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controllers');
const { authMiddleware, isAdmin, isPrestataire } = require('../middlewares/auth.middleware');
const { validatePromotion } = require('../middlewares/validation.middleware');

// PUBLIC
router.get('/', promotionController.getAll);
router.get('/:id', promotionController.getById);

// PRESTATAIRE
router.post('/', authMiddleware, isPrestataire, promotionController.create);
router.put('/:id', authMiddleware, isPrestataire, promotionController.update);
router.delete('/:id', authMiddleware, isPrestataire, promotionController.delete);
router.get('/me/list', authMiddleware, isPrestataire, promotionController.getMine);

// ADMIN
router.delete('/admin/:id', authMiddleware, isAdmin, promotionController.adminDelete);

module.exports = router;