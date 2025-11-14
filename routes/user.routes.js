const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controllers');
const { authMiddleware, isAdmin } = require('../middlewares/auth.middleware');
const { validateRegistration, validateLogin } = require('../middlewares/validation.middleware');

// ==========================================
// ROUTES PUBLIQUES (pas de auth requis)
// ==========================================

/**
 * POST /api/users/register
 * Inscription classique (email/password)
 */
router.post('/register', validateRegistration, userController.register);

/**
 * POST /api/users/login
 * Connexion classique (email/password)
 */
router.post('/login', validateLogin, userController.login);

/**
 * POST /api/users/google
 * Connexion avec Google OAuth
 */
router.post('/google', userController.loginGoogle);

/**
 * POST /api/users/apple
 * Connexion avec Apple OAuth
 */
router.post('/apple', userController.loginApple);

/**
 * POST /api/users/refresh-token
 * Rafraîchir le token JWT
 */
router.post('/refresh-token', userController.refreshToken);

/**
 * POST /api/users/forgot-password
 * Demande de réinitialisation de mot de passe
 */
router.post('/forgot-password', userController.forgotPassword);

/**
 * POST /api/users/reset-password
 * Réinitialisation du mot de passe
 */
router.post('/reset-password', userController.resetPassword);

// ==========================================
// ROUTES PROTÉGÉES (auth requis)
// ==========================================

/**
 * GET /api/users/me
 * Obtenir le profil de l'utilisateur connecté
 */
router.get('/me', authMiddleware, userController.getProfile);

/**
 * PUT /api/users/me
 * Mettre à jour le profil
 */
router.put('/me', authMiddleware, userController.updateProfile);

/**
 * PUT /api/users/me/password
 * Changer le mot de passe
 */
router.put('/me/password', authMiddleware, userController.changePassword);

/**
 * DELETE /api/users/me
 * Supprimer son compte
 */
router.delete('/me', authMiddleware, userController.deleteAccount);

/**
 * GET /api/users/me/stats
 * Statistiques de l'utilisateur (scans, avis, etc.)
 */
router.get('/me/stats', authMiddleware, userController.getStats);

// ==========================================
// ROUTES ADMIN (auth + admin requis)
// ==========================================

/**
 * GET /api/users
 * Liste tous les utilisateurs (admin)
 */
router.get('/', authMiddleware, isAdmin, userController.getAllUsers);

/**
 * GET /api/users/:id
 * Obtenir un utilisateur par ID (admin)
 */
router.get('/:id', authMiddleware, isAdmin, userController.getUserById);

/**
 * PUT /api/users/:id
 * Mettre à jour un utilisateur (admin)
 */
router.put('/:id', authMiddleware, isAdmin, userController.updateUser);

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur (admin)
 */
router.delete('/:id', authMiddleware, isAdmin, userController.deleteUser);

/**
 * POST /api/users/:id/blacklist
 * Blacklister un utilisateur (admin)
 */
router.post('/:id/blacklist', authMiddleware, isAdmin, userController.blacklistUser);

/**
 * DELETE /api/users/:id/blacklist
 * Retirer de la blacklist (admin)
 */
router.delete('/:id/blacklist', authMiddleware, isAdmin, userController.unblacklistUser);

/**
 * GET /api/users/blacklisted
 * Liste des utilisateurs blacklistés (admin)
 */
router.get('/admin/blacklisted', authMiddleware, isAdmin, userController.getBlacklistedUsers);

/**
 * POST /api/users/:id/verify-email
 * Vérifier l'email d'un utilisateur (admin)
 */
router.post('/:id/verify-email', authMiddleware, isAdmin, userController.verifyEmail);

module.exports = router;
