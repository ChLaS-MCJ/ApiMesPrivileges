// __tests__/setup.js
const db = require('../db.config');

// ==========================================
// CONFIGURATION ENVIRONNEMENT TEST
// ==========================================

// ✅ Augmenter la durée des tokens pour les tests
process.env.JWT_EXPIRES_IN = '24h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';

// ==========================================
// SETUP GLOBAL
// ==========================================

beforeAll(async () => {
  console.log('🧪 Tests sur:', process.env.DB_NAME_TEST || process.env.DB_NAME);
  
  // Synchroniser la base de données
  await db.syncDatabase(true); // force: true pour tout recréer
  
  console.log('✅ BDD test prête');
});

// ==========================================
// CLEANUP GLOBAL
// ==========================================

afterAll(async () => {
  // Fermer la connexion proprement
  await db.sequelize.close();
  console.log('\n✅ Connexion fermée');
});

// ==========================================
// TIMEOUT
// ==========================================

// Augmenter le timeout pour les tests qui peuvent être lents
jest.setTimeout(30000); // 30 secondes