const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controllers');
const { authMiddleware, isAdmin } = require('../middlewares/auth.middleware');

// PUBLIC
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.get('/slug/:slug', categoryController.getBySlug);

// ADMIN
router.post('/', authMiddleware, isAdmin, categoryController.create);
router.put('/:id', authMiddleware, isAdmin, categoryController.update);
router.delete('/:id', authMiddleware, isAdmin, categoryController.delete);

module.exports = router;
