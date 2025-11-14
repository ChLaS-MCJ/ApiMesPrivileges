// server.js
require('dotenv').config();

const startServer = async (db, app) => {
  const [major, minor] = process.versions.node.split('.').map(parseFloat);
  if (major < 14 || (major === 14 && minor <= 0)) {
    console.log('Veuillez vous rendre sur nodejs.org et télécharger la version 14 ou une version ultérieure. 👌\n');
    process.exit();
  }

  try {
    await db.sequelize.authenticate();
    console.log('✔️ Connexion à la base de données relationnelle réussie.');
    
    const PORT = process.env.SERVER_PORT || process.env.PORT || 8888;
    
    app.listen(PORT, () => {
      console.log(`🚀 Express running → On PORT : ${PORT}.⭐️`);
    });
  } catch (err) {
    console.log('1. 🔥 Erreur: server.js');
    console.error(`🚫 Error → : ${err.message}`);
    process.exit(1);
  }
};

// Ne démarrer le serveur QUE si on n'est pas en mode test
if (process.env.NODE_ENV !== 'test') {
  startServer(require('./db.config'), require('./app'));
}

// Toujours exporter app pour les tests
module.exports = require('./app');