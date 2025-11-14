const db = require('../db.config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');


const { User, Role, Client, Prestataire } = db;

// ==========================================
// HELPERS
// ==========================================

/**
 * Génère un token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      roleId: user.roleId 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

/**
 * Génère un refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// ==========================================
// INSCRIPTION & CONNEXION
// ==========================================

/**
 * POST /api/users/register
 * Inscription classique
 */
exports.register = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { email, password, prenom, nom, telephone } = req.body;

    // Vérifier si email existe
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUND) || 10);

    // Récupérer le rôle client
    const clientRole = await db.Role.findOne({ where: { name: 'client' } });
    if (!clientRole) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Rôle client non trouvé'
      });
    }

    // Créer l'utilisateur
    const user = await db.User.create({
      email,
      password: hashedPassword,
      roleId: clientRole.id,
      isEmailVerified: false
    }, { transaction });

    // Générer un QR code unique
    const qrCode = `QR-${user.id}-${crypto.randomBytes(16).toString('hex')}`;

    // Créer le profil client avec QR code
    await db.Client.create({
      userId: user.id,
      qrCode,
      prenom: prenom || null,
      nom: nom || null,
      telephone: telephone || null,
      dateInscription: new Date()
    }, { transaction });

    await transaction.commit();

    // Générer le token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    // Sauvegarder refresh token
    await user.update({ refreshToken });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: 'client'
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur register:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/users/login
 * Connexion classique
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }

    // Vérifier blacklist
    if (user.isBlacklisted()) {
      return res.status(403).json({ 
        success: false,
        message: `Votre compte a été bloqué. Raison: ${user.raisonBlacklist}` 
      });
    }

    // Vérifier verrouillage
    if (user.isLocked()) {
      return res.status(423).json({ 
        success: false,
        message: 'Compte temporairement verrouillé suite à trop de tentatives' 
      });
    }

    // Vérifier le mot de passe
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      await user.incLoginAttempts();
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }

    // Reset tentatives
    await user.resetLoginAttempts();

    // Générer les tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Sauvegarder le refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: user.toJSON(),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message 
    });
  }
};

/**
 * POST /api/users/google
 * Connexion avec Google
 */
exports.loginGoogle = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { googleId, email, prenom, nom } = req.body;

    if (!googleId || !email) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Google ID et email requis'
      });
    }

    // Chercher utilisateur existant
    let user = await db.User.findOne({ 
      where: { 
        [db.Sequelize.Op.or]: [
          { googleId },
          { email }
        ]
      } 
    });

    if (!user) {
      // Créer nouvel utilisateur OAuth (sans password)
      const clientRole = await db.Role.findOne({ where: { name: 'client' } });
      
      user = await db.User.create({
        email,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10), // Password aléatoire
        googleId,
        oauthProvider: 'google',
        roleId: clientRole.id,
        isEmailVerified: true // Email vérifié par Google
      }, { transaction });

      // Créer profil client
 
      const qrCode = `QR-${user.id}-${crypto.randomBytes(16).toString('hex')}`;
      
      await db.Client.create({
        userId: user.id,
        qrCode,
        prenom: prenom || null,
        nom: nom || null,
        dateInscription: new Date()
      }, { transaction });
    } else if (!user.googleId) {
      // Lier compte existant avec Google
      await user.update({ googleId, oauthProvider: 'google' }, { transaction });
    }

    await transaction.commit();

    // Générer tokens
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    await user.update({ refreshToken, lastLogin: new Date() });

    res.json({
      success: true,
      message: 'Connexion Google réussie',
      data: { user: { id: user.id, email: user.email }, token, refreshToken }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur login Google:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion Google',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/users/apple
 * Connexion avec Apple
 */
exports.loginApple = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { appleId, email, prenom, nom } = req.body;

    if (!appleId || !email) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Apple ID et email requis'
      });
    }

    // Chercher utilisateur existant
    let user = await db.User.findOne({ 
      where: { 
        [db.Sequelize.Op.or]: [
          { appleId },
          { email }
        ]
      } 
    });

    if (!user) {
      // Créer nouvel utilisateur OAuth (sans password)

      const clientRole = await db.Role.findOne({ where: { name: 'client' } });
      
      if (!clientRole) {
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: 'Rôle client non trouvé'
        });
      }

      user = await db.User.create({
        email,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10), // Password aléatoire
        appleId,
        oauthProvider: 'apple',
        roleId: clientRole.id,
        isEmailVerified: true // Email vérifié par Apple
      }, { transaction });

      // Créer profil client avec QR code
      const qrCode = `QR-${user.id}-${crypto.randomBytes(16).toString('hex')}`;
      
      await db.Client.create({
        userId: user.id,
        qrCode,
        prenom: prenom || null,
        nom: nom || null,
        dateInscription: new Date()
      }, { transaction });

    } else if (!user.appleId) {
      // Lier compte existant avec Apple
      await user.update({ 
        appleId, 
        oauthProvider: 'apple',
        isEmailVerified: true 
      }, { transaction });
    }

    await transaction.commit();

    // Générer tokens JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    // Mettre à jour refresh token et lastLogin
    await user.update({ 
      refreshToken, 
      lastLogin: new Date() 
    });

    res.json({
      success: true,
      message: 'Connexion Apple réussie',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: 'client'
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur login Apple:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion Apple',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/users/refresh-token
 * Rafraîchir le token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token manquant' 
      });
    }

    // Vérifier le refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Trouver l'utilisateur
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token invalide' 
      });
    }

    // Générer nouveaux tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Erreur refresh token:', error);
    res.status(401).json({ 
      success: false,
      message: 'Refresh token invalide ou expiré' 
    });
  }
};

// ==========================================
// PROFIL UTILISATEUR
// ==========================================

/**
 * GET /api/users/me
 * Obtenir son profil
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Role, as: 'role' },
        { 
          model: Client, 
          as: 'client',
          required: false
        },
        { 
          model: Prestataire, 
          as: 'prestataire',
          required: false,
          include: [{ model: db.Category, as: 'category' }]
        }
      ]
    });

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Erreur getProfile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message 
    });
  }
};

/**
 * PUT /api/users/me
 * Mettre à jour son profil
 */
exports.updateProfile = async (req, res) => {
  try {
    const { email, preferences } = req.body;
    const user = await User.findByPk(req.user.id);

    // Mettre à jour les champs autorisés
    if (email && email !== user.email) {
      // Vérifier si email déjà utilisé
      const existing = await User.findOne({ 
        where: { 
          email,
          id: { [Op.ne]: user.id }
        } 
      });
      
      if (existing) {
        return res.status(400).json({ 
          success: false,
          message: 'Cet email est déjà utilisé' 
        });
      }
      
      user.email = email;
      user.isEmailVerified = false; // Doit re-vérifier
    }

    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Erreur updateProfile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message 
    });
  }
};

/**
 * PUT /api/users/me/password
 * Changer son mot de passe
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    // Vérifier si connexion OAuth
    if (user.oauthProvider !== 'local') {
      return res.status(400).json({ 
        success: false,
        message: 'Impossible de changer le mot de passe pour une connexion OAuth' 
      });
    }

    // Vérifier l'ancien mot de passe
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Mot de passe actuel incorrect' 
      });
    }

    // Changer le mot de passe
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur changePassword:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      error: error.message 
    });
  }
};

/**
 * DELETE /api/users/me
 * Supprimer son compte
 */
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    await user.destroy(); // Soft delete

    res.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur deleteAccount:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message 
    });
  }
};

/**
 * GET /api/users/me/stats
 * Statistiques de l'utilisateur
 */
exports.getStats = async (req, res) => {
  try {
    const stats = {};

    // Si client
    const client = await Client.findOne({ where: { userId: req.user.id } });
    if (client) {
      stats.client = {
        nombreScans: client.nombreScans,
        nombreAvis: client.nombreAvisLaisses,
        commercesFavoris: client.commercesFavoris?.length || 0
      };
    }

    // Si prestataire
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });
    if (prestataire) {
      stats.prestataire = {
        nombreScansTotal: prestataire.nombreScansTotal,
        nombreClientsUniques: prestataire.nombreClientsUniques,
        nombreVisitesFiche: prestataire.nombreVisitesFiche,
        noteGlobale: prestataire.noteGlobale,
        nombreAvis: prestataire.nombreAvis
      };
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des stats',
      error: error.message 
    });
  }
};

// ==========================================
// GESTION MOT DE PASSE
// ==========================================

/**
 * POST /api/users/forgot-password
 * Demander réinitialisation
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Ne pas révéler si l'email existe
      return res.json({
        success: true,
        message: 'Si cet email existe, vous recevrez un lien de réinitialisation'
      });
    }

    // Générer token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1h
    await user.save();

    // TODO: Envoyer email avec le token
    // await sendPasswordResetEmail(user.email, resetToken);

    res.json({
      success: true,
      message: 'Email de réinitialisation envoyé',
      // En dev uniquement
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    console.error('Erreur forgotPassword:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la demande',
      error: error.message 
    });
  }
};

/**
 * POST /api/users/reset-password
 * Réinitialiser le mot de passe
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Token invalide ou expiré' 
      });
    }

    // Changer le mot de passe
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la réinitialisation',
      error: error.message 
    });
  }
};

// ==========================================
// ADMIN - GESTION UTILISATEURS
// ==========================================

/**
 * GET /api/users
 * Liste tous les utilisateurs
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, blacklisted } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (role) where.roleId = role;
    if (blacklisted !== undefined) where.estBlackliste = blacklisted === 'true';

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [
        { model: Role, as: 'role' },
        { model: Client, as: 'client', required: false },
        { model: Prestataire, as: 'prestataire', required: false }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur getAllUsers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

/**
 * GET /api/users/:id
 * Obtenir un utilisateur
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Client, as: 'client', required: false },
        { model: Prestataire, as: 'prestataire', required: false }
      ]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Erreur getUserById:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

/**
 * PUT /api/users/:id
 * Mettre à jour un utilisateur
 */
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    const { email, isActive, isEmailVerified, roleId } = req.body;

    if (email) user.email = email;
    if (isActive !== undefined) user.isActive = isActive;
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;
    if (roleId) user.roleId = roleId;

    await user.save();

    res.json({
      success: true,
      message: 'Utilisateur mis à jour',
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Erreur updateUser:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message 
    });
  }
};

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'Utilisateur supprimé'
    });

  } catch (error) {
    console.error('Erreur deleteUser:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message 
    });
  }
};

/**
 * POST /api/users/:id/blacklist
 * Blacklister un utilisateur
 */
exports.blacklistUser = async (req, res) => {
  try {
    const { raison } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    await user.blacklister(raison);

    res.json({
      success: true,
      message: 'Utilisateur blacklisté',
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Erreur blacklistUser:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du blacklistage',
      error: error.message 
    });
  }
};

/**
 * DELETE /api/users/:id/blacklist
 * Retirer de la blacklist
 */
exports.unblacklistUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    await user.deblacklister();

    res.json({
      success: true,
      message: 'Utilisateur retiré de la blacklist',
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Erreur unblacklistUser:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du retrait de la blacklist',
      error: error.message 
    });
  }
};

/**
 * GET /api/users/admin/blacklisted
 * Liste des blacklistés
 */
exports.getBlacklistedUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { estBlackliste: true },
      include: [
        { model: Role, as: 'role' },
        { model: Client, as: 'client', required: false },
        { model: Prestataire, as: 'prestataire', required: false }
      ],
      order: [['dateBlacklist', 'DESC']]
    });

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Erreur getBlacklistedUsers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

/**
 * POST /api/users/:id/verify-email
 * Vérifier l'email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    res.json({
      success: true,
      message: 'Email vérifié',
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Erreur verifyEmail:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la vérification',
      error: error.message 
    });
  }
};
