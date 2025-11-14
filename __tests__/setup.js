const db = require('../db.config');

beforeAll(async () => {
  // Vérification de sécurité
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('❌ NODE_ENV doit être "test" pour lancer les tests !');
  }

  const dbName = db.sequelize.config.database;
  if (!dbName.includes('_test')) {
    throw new Error(`❌ La base de données doit finir par "_test" ! Actuelle: ${dbName}`);
  }

  console.log(`🧪 Tests sur: ${dbName}`);

  try {
    // Connexion
    await db.sequelize.authenticate();

    // Reset complet
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.sequelize.sync({ force: true });
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Données de base
    await db.createDefaultRoles();
    await db.createDefaultCategories();

    console.log('✅ BDD test prête\n');

  } catch (error) {
    console.error('❌ Erreur setup:', error.message);
    throw error;
  }
});

afterAll(async () => {
  await db.sequelize.close();
  console.log('\n✅ Connexion fermée');
});

// Nettoyage entre chaque test
afterEach(async () => {
  try {
    await db.Avis.destroy({ where: {}, force: true });
    await db.Scan.destroy({ where: {}, force: true });
    await db.Promotion.destroy({ where: {}, force: true });
    await db.Prestataire.destroy({ where: {}, force: true });
    await db.Client.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
  } catch (error) {
    // Ignorer
  }
});