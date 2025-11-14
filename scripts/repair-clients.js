/**
 * Script de réparation : Crée les profils Client manquants
 * Pour les Users avec role="client" qui n'ont pas de profil dans la table clients
 */

const db = require('../db.config');

async function repairMissingClientProfiles() {
  console.log('\n🔧 Réparation des profils Client manquants...\n');

  try {
    // Connexion
    await db.testConnection();

    // Trouver le role client
    const clientRole = await db.Role.findOne({ where: { name: 'client' } });
    
    if (!clientRole) {
      console.log('❌ Rôle client non trouvé. Lance d\'abord: npm run init');
      process.exit(1);
    }

    // Trouver tous les Users avec role client
    const clientUsers = await db.User.findAll({
      where: { roleId: clientRole.id },
      include: [{
        model: db.Client,
        as: 'client',
        required: false
      }]
    });

    console.log(`📊 Trouvé ${clientUsers.length} user(s) avec rôle client\n`);

    let created = 0;
    let existing = 0;

    for (const user of clientUsers) {
      if (!user.client) {
        // Profil Client manquant, le créer
        await db.Client.create({
          userId: user.id,
          prenom: 'User',
          nom: `${user.id}`,
          telephone: null
        });
        
        console.log(`✅ Profil créé pour: ${user.email}`);
        created++;
      } else {
        console.log(`✓  Profil existe déjà: ${user.email}`);
        existing++;
      }
    }

    console.log('\n');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ✅ RÉPARATION TERMINÉE                   ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('\n');
    console.log('📊 Résultats:');
    console.log(`   - Profils créés: ${created}`);
    console.log(`   - Profils existants: ${existing}`);
    console.log(`   - Total: ${clientUsers.length}`);
    console.log('\n');

    // Vérification finale
    const totalClients = await db.Client.count();
    console.log(`✅ Total clients dans la BDD: ${totalClients}\n`);

    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

repairMissingClientProfiles();
