/**
 * Script de création automatique de la BDD de test
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupTestDatabase() {
  console.log('\n🔧 Configuration de la base de données de test...\n');

  // Afficher la config (sans le password)
  console.log('📋 Configuration:');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   User: ${process.env.DB_USER}`);
  console.log(`   Port: ${process.env.DB_PORT || 3306}`);
  console.log(`   DB: ${process.env.DB_NAME}\n`);

  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('❌ Variables d\'environnement manquantes dans .env');
    console.error('   Vérifiez: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    process.exit(1);
  }

  try {
    // Connexion MySQL sans spécifier de DB
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('✅ Connexion MySQL réussie\n');

    const testDbName = process.env.DB_NAME + '_test';

    // Vérifier si la BDD existe
    const [databases] = await connection.query(
      'SHOW DATABASES LIKE ?',
      [testDbName]
    );

    if (databases.length > 0) {
      console.log(`ℹ️  Base de données "${testDbName}" existe déjà`);
    } else {
      // Créer la BDD de test
      await connection.query(`
        CREATE DATABASE \`${testDbName}\`
        CHARACTER