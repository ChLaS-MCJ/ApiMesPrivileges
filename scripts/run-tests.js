#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE TEST COMPLET
 * Lance tous les tests et génère un rapport
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('\n');
console.log('╔════════════════════════════════════════════╗');
console.log('║  🧪 LANCEMENT DES TESTS UNITAIRES         ║');
console.log('╚════════════════════════════════════════════╝');
console.log('\n');

// Vérifier si .env.test existe
if (!fs.existsSync('.env.test')) {
  console.log('⚠️  Fichier .env.test manquant, création...\n');
  
  const envTest = `# Configuration de test
NODE_ENV=test
PORT=3001

# Base de données de TEST (IMPORTANTE - Ne pas utiliser la prod!)
DB_NAME=qr_promo_test
DB_USER=root
DB_PASS=
DB_HOST=localhost
DB_PORT=3306

# JWT
JWT_SECRET=test_secret_key_super_secure_change_this_in_production
JWT_REFRESH_SECRET=test_refresh_secret_key_super_secure_change_this_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*
`;
  
  fs.writeFileSync('.env.test', envTest);
  console.log('✅ Fichier .env.test créé\n');
}

// Charger les variables d'environnement de test
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

try {
  console.log('📋 Configuration:');
  console.log(`   - Environnement: ${process.env.NODE_ENV}`);
  console.log(`   - Base de données: ${process.env.DB_NAME}`);
  console.log(`   - Port: ${process.env.PORT}`);
  console.log('\n');

  console.log('🚀 Exécution des tests...\n');

  // Lancer Jest
  execSync('npx jest --setupFilesAfterEnv=./__tests__/setup.js --coverage --verbose', {
    stdio: 'inherit',
    env: process.env
  });

  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  ✅ TOUS LES TESTS SONT PASSÉS!           ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\n');
  console.log('📊 Rapport de couverture disponible dans: ./coverage/\n');

} catch (error) {
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  ❌ CERTAINS TESTS ONT ÉCHOUÉ             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\n');
  console.log('Consultez les logs ci-dessus pour plus de détails.\n');
  process.exit(1);
}
