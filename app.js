const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();

// ==========================================
// MIDDLEWARES GLOBAUX
// ==========================================

// Sécurité
app.use(helmet());

// Compression
app.use(compression());

// Parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: "Origin, X-Requested-With, x-access-token, role, Content, Accept, Content-Type, Authorization",
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Logging (uniquement en développement)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ==========================================
// IMPORT DES ROUTES
// ==========================================

// Routes principales de l'application
const user_router = require('./routes/user.routes');
const prestataire_router = require('./routes/prestataire.routes');
const category_router = require('./routes/category.routes');
const promotion_router = require('./routes/promotion.routes');
const scan_router = require('./routes/scan.routes');
const avis_router = require('./routes/avis.routes');

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API QR Code Promotions',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  try {
    const db = require('./db.config');
    await db.sequelize.authenticate();
    
    res.json({
      success: true,
      status: 'OK',
      database: 'Connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message
    });
  }
});

// ==========================================
// ROUTES API
// ==========================================

// Routes principales
app.use('/api/users', user_router);
app.use('/api/prestataires', prestataire_router);
app.use('/api/categories', category_router);
app.use('/api/promotions', promotion_router);
app.use('/api/scans', scan_router);
app.use('/api/avis', avis_router);

// ==========================================
// FICHIERS STATIQUES
// ==========================================

app.use('/api/images', express.static(path.join(__dirname, 'Assets/Images')));

// ==========================================
// GESTION DES ERREURS
// ==========================================

// Route non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.path
  });
});

// Gestionnaire d'erreurs global
app.use((error, req, res, next) => {
  console.error('Erreur globale:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

module.exports = app;