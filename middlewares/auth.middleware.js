const jwt = require('jsonwebtoken');
const db = require('../db.config');
const { User, Role } = db;

/**
 * Middleware d'authentification
 * Vérifie le token JWT et charge l'utilisateur
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // Récupérer le token du header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Charger l'utilisateur
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si blacklisté
    if (user.isBlacklisted()) {
      return res.status(403).json({
        success: false,
        message: `Votre compte a été bloqué. Raison: ${user.raisonBlacklist}`
      });
    }

    // Vérifier si actif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est désactivé'
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }

    console.error('Erreur authMiddleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

/**
 * Middleware pour vérifier si l'utilisateur est admin
 */
exports.isAdmin = (req, res, next) => {
  if (req.user.role.name !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès interdit - Admin uniquement'
    });
  }
  next();
};

/**
 * Middleware pour vérifier si l'utilisateur est prestataire
 */
exports.isPrestataire = (req, res, next) => {
  if (req.user.role.name !== 'prestataire') {
    return res.status(403).json({
      success: false,
      message: 'Accès interdit - Prestataires uniquement'
    });
  }
  next();
};

/**
 * Middleware pour vérifier si l'utilisateur est client
 */
exports.isClient = (req, res, next) => {
  if (req.user.role.name !== 'client') {
    return res.status(403).json({
      success: false,
      message: 'Accès interdit - Clients uniquement'
    });
  }
  next();
};

/**
 * Middleware optionnel - charge l'user si token présent
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (user && !user.isBlacklisted() && user.isActive) {
      req.user = user;
    }

    next();

  } catch (error) {
    // Ignorer les erreurs, juste continuer sans user
    next();
  }
};
