const express = require('express');
const router = express.Router();
const prestataireController = require('../controllers/prestataire.controllers');
const { authMiddleware, isAdmin, isPrestataire } = require('../middlewares/auth.middleware');
const { validatePrestataire } = require('../middlewares/validation.middleware');

// ==========================================
// ROUTES PUBLIQUES
// ==========================================

/**
 * GET /api/prestataires
 * Liste tous les commerces (publique avec filtres)
 */
router.get('/', prestataireController.getAll);

/**
 * GET /api/prestataires/:id
 * Détails d'un commerce
 */
router.get('/:id', prestataireController.getById);

/**
 * GET /api/prestataires/ville/:ville
 * Commerces par ville
 */
router.get('/ville/:ville', prestataireController.getByVille);

/**
 * GET /api/prestataires/search
 * Recherche avec coordonnées GPS
 */
router.get('/search/nearby', prestataireController.searchNearby);

/**
 * GET /api/prestataires/:id/promotions
 * Promotions actives d'un commerce
 */
router.get('/:id/promotions', prestataireController.getPromotions);

// ==========================================
// ROUTES PRESTATAIRE (auth + prestataire)
// ==========================================

/**
 * POST /api/prestataires
 * Créer son commerce
 */
router.post('/', authMiddleware, isPrestataire, validatePrestataire, prestataireController.create);

/**
 * PUT /api/prestataires/me
 * Modifier son commerce
 */
router.put('/me', authMiddleware, isPrestataire, prestataireController.updateMe);

/**
 * GET /api/prestataires/me
 * Mon commerce
 */
router.get('/me/info', authMiddleware, isPrestataire, prestataireController.getMe);

/**
 * POST /api/prestataires/me/images
 * Ajouter une image
 */
router.post('/me/images', authMiddleware, isPrestataire, prestataireController.addImage);

/**
 * DELETE /api/prestataires/me/images/:index
 * Supprimer une image
 */
router.delete('/me/images/:index', authMiddleware, isPrestataire, prestataireController.deleteImage);

/**
 * PUT /api/prestataires/me/horaires
 * Modifier horaires
 */
router.put('/me/horaires', authMiddleware, isPrestataire, prestataireController.updateHoraires);

/**
 * GET /api/prestataires/me/stats
 * Statistiques de mon commerce
 */
router.get('/me/stats', authMiddleware, isPrestataire, prestataireController.getStats);

/**
 * GET /api/prestataires/me/scans
 * Historique des scans
 */
router.get('/me/scans', authMiddleware, isPrestataire, prestataireController.getScans);

// ==========================================
// ROUTES ADMIN
// ==========================================

/**
 * PUT /api/prestataires/:id
 * Modifier un commerce (admin)
 */
router.put('/:id', authMiddleware, isAdmin, prestataireController.update);

/**
 * DELETE /api/prestataires/:id
 * Supprimer un commerce (admin)
 */
router.delete('/:id', authMiddleware, isAdmin, prestataireController.delete);

/**
 * POST /api/prestataires/:id/verify
 * Vérifier un commerce (admin)
 */
router.post('/:id/verify', authMiddleware, isAdmin, prestataireController.verify);

/**
 * POST /api/prestataires/:id/blacklist
 * Blacklister un commerce (admin)
 */
router.post('/:id/blacklist', authMiddleware, isAdmin, prestataireController.blacklist);

/**
 * DELETE /api/prestataires/:id/blacklist
 * Déblocquer un commerce (admin)
 */
router.delete('/:id/blacklist', authMiddleware, isAdmin, prestataireController.unblacklist);

module.exports = router;