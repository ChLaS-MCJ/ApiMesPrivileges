const { body, validationResult } = require('express-validator');

/**
 * Middleware pour gérer les erreurs de validation
 */
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * Validation pour l'inscription
 */
exports.validateRegistration = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre'),
  
  body('role')
    .optional()
    .isIn(['client', 'prestataire']).withMessage('Rôle invalide'),
  
  body('prenom')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Prénom invalide'),
  
  body('nom')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nom invalide'),
  
  body('telephone')
    .optional()
    .matches(/^(\+33|0)[1-9](\d{2}){4}$/).withMessage('Numéro de téléphone français invalide'),
  
  exports.handleValidationErrors
];

/**
 * Validation pour la connexion
 */
exports.validateLogin = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Mot de passe requis'),
  
  exports.handleValidationErrors
];

/**
 * Validation pour Google OAuth
 */
exports.validateGoogleAuth = [
  body('googleId')
    .notEmpty().withMessage('Google ID requis'),
  
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  body('nom')
    .optional()
    .trim(),
  
  body('prenom')
    .optional()
    .trim(),
  
  exports.handleValidationErrors
];

/**
 * Validation pour Apple OAuth
 */
exports.validateAppleAuth = [
  body('appleId')
    .notEmpty().withMessage('Apple ID requis'),
  
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  exports.handleValidationErrors
];

/**
 * Validation pour changement de mot de passe
 */
exports.validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Mot de passe actuel requis'),
  
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre'),
  
  exports.handleValidationErrors
];

/**
 * Validation pour forgot password
 */
exports.validateForgotPassword = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  exports.handleValidationErrors
];

/**
 * Validation pour reset password
 */
exports.validateResetPassword = [
  body('token')
    .notEmpty().withMessage('Token requis'),
  
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre'),
  
  exports.handleValidationErrors
];

/**
 * Validation pour blacklist
 */
exports.validateBlacklist = [
  body('raison')
    .notEmpty().withMessage('Raison du blocage requise')
    .isLength({ min: 10, max: 500 }).withMessage('La raison doit contenir entre 10 et 500 caractères'),
  
  exports.handleValidationErrors
];

/**
 * Validation pour mise à jour profil
 */
exports.validateUpdateProfile = [
  body('email')
    .optional()
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  body('preferences')
    .optional()
    .isObject().withMessage('Préférences doivent être un objet'),
  
  exports.handleValidationErrors
];

/**
 * Validation pour création prestataire
 */
exports.validatePrestataire = [
  body('nomCommerce')
    .notEmpty().withMessage('Nom du commerce requis')
    .isLength({ min: 2, max: 200 }).withMessage('Nom du commerce entre 2 et 200 caractères'),
  
  body('typeCommerce')
    .notEmpty().withMessage('Type de commerce requis')
    .isLength({ min: 2, max: 100 }).withMessage('Type invalide'),
  
  body('categoryId')
    .notEmpty().withMessage('Catégorie requise')
    .isInt().withMessage('ID de catégorie invalide'),
  
  body('adresse')
    .notEmpty().withMessage('Adresse requise'),
  
  body('codePostal')
    .notEmpty().withMessage('Code postal requis')
    .matches(/^\d{5}$/).withMessage('Code postal invalide (5 chiffres)'),
  
  body('ville')
    .notEmpty().withMessage('Ville requise')
    .isLength({ min: 2, max: 100 }).withMessage('Ville invalide'),
  
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  
  exports.handleValidationErrors
];

/**
 * Validation pour création promotion
 */
exports.validatePromotion = [
  body('titre')
    .notEmpty().withMessage('Titre requis')
    .isLength({ min: 5, max: 200 }).withMessage('Titre entre 5 et 200 caractères'),
  
  body('description')
    .notEmpty().withMessage('Description requise')
    .isLength({ min: 10 }).withMessage('Description trop courte'),
  
  body('dateDebut')
    .notEmpty().withMessage('Date de début requise')
    .isISO8601().withMessage('Date de début invalide'),
  
  body('dateFin')
    .notEmpty().withMessage('Date de fin requise')
    .isISO8601().withMessage('Date de fin invalide')
    .custom((dateFin, { req }) => {
      if (new Date(dateFin) <= new Date(req.body.dateDebut)) {
        throw new Error('Date de fin doit être après la date de début');
      }
      return true;
    }),
  
  exports.handleValidationErrors
];

/**
 * Validation pour scan QR
 */
exports.validateScan = [
  body('qrCode')
    .notEmpty().withMessage('QR Code requis'),
  
  body('promotionId')
    .notEmpty().withMessage('ID promotion requis')
    .isInt().withMessage('ID promotion invalide'),
  
  exports.handleValidationErrors
];

/**
 * Validation pour avis
 */
exports.validateAvis = [
  body('scanId')
    .notEmpty().withMessage('ID scan requis')
    .isInt().withMessage('ID scan invalide'),
  
  body('note')
    .notEmpty().withMessage('Note requise')
    .isInt({ min: 1, max: 5 }).withMessage('Note doit être entre 1 et 5'),
  
  exports.handleValidationErrors
];