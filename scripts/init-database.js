/**
 * 🚀 SCRIPT D'INITIALISATION COMPLET
 */

const db = require('../db.config');
const crypto = require('crypto');

const PRENOMS = ['Marie', 'Jean', 'Sophie', 'Pierre', 'Julie', 'Thomas', 'Emma', 'Lucas', 'Léa', 'Nicolas'];
const NOMS = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy'];

const VILLES = [
  { nom: 'Paris', cp: '75001', lat: 48.8566, lon: 2.3522 },
  { nom: 'Lyon', cp: '69001', lat: 45.7640, lon: 4.8357 },
  { nom: 'Marseille', cp: '13001', lat: 43.2965, lon: 5.3698 },
  { nom: 'Toulouse', cp: '31000', lat: 43.6047, lon: 1.4442 },
  { nom: 'Nice', cp: '06000', lat: 43.7102, lon: 7.2620 },
  { nom: 'Nantes', cp: '44000', lat: 47.2184, lon: -1.5536 },
  { nom: 'Bordeaux', cp: '33000', lat: 44.8378, lon: -0.5792 },
  { nom: 'Lille', cp: '59000', lat: 50.6292, lon: 3.0573 },
  { nom: 'Rennes', cp: '35000', lat: 48.1173, lon: -1.6778 },
  { nom: 'Strasbourg', cp: '67000', lat: 48.5734, lon: 7.7521 }
];

const COMMERCES = [
  { nom: 'Le Gourmet Français', type: 'restaurant', cat: 'restaurants', desc: 'Cuisine française traditionnelle' },
  { nom: 'Sushi Paradise', type: 'restaurant', cat: 'restaurants', desc: 'Restaurant japonais authentique' },
  { nom: 'Pizzeria Bella Vita', type: 'restaurant', cat: 'restaurants', desc: 'Pizzas italiennes au feu de bois' },
  { nom: 'Le Bistrot du Coin', type: 'restaurant', cat: 'restaurants', desc: 'Plats du jour faits maison' },
  { nom: 'Hôtel des Alpes', type: 'hotel', cat: 'hotels', desc: 'Hôtel 4 étoiles avec vue' },
  { nom: 'Le Palace Royal', type: 'hotel', cat: 'hotels', desc: 'Hôtel de luxe centre-ville' },
  { nom: 'Auberge du Lac', type: 'hotel', cat: 'hotels', desc: 'Hébergement en bord de lac' },
  { nom: 'Fashion Boutique', type: 'magasin', cat: 'mode-vetements', desc: 'Vêtements tendance' },
  { nom: 'Style & Chic', type: 'magasin', cat: 'mode-vetements', desc: 'Prêt-à-porter haut de gamme' },
  { nom: 'Urban Wear', type: 'magasin', cat: 'mode-vetements', desc: 'Mode urbaine streetwear' },
  { nom: 'La Garde-Robe', type: 'magasin', cat: 'mode-vetements', desc: 'Vêtements élégants' },
  { nom: 'Spa Zen Attitude', type: 'spa', cat: 'beaute-spa', desc: 'Soins et massages' },
  { nom: 'Salon Élégance', type: 'salon', cat: 'beaute-spa', desc: 'Coiffure professionnelle' },
  { nom: 'Beauty Center', type: 'institut', cat: 'beaute-spa', desc: 'Institut de beauté' },
  { nom: 'FitZone Gym', type: 'salle-sport', cat: 'sport-fitness', desc: 'Salle de sport équipée' },
  { nom: 'Yoga Studio', type: 'studio', cat: 'sport-fitness', desc: 'Cours de yoga' },
  { nom: 'Tech Store', type: 'magasin', cat: 'high-tech', desc: 'Smartphones et ordinateurs' },
  { nom: 'Gaming Zone', type: 'magasin', cat: 'high-tech', desc: 'Matériel gaming' },
  { nom: 'Voyages Passion', type: 'agence-voyage', cat: 'agences-voyage', desc: 'Voyages sur mesure' },
  { nom: 'Évasion Tropicale', type: 'agence-voyage', cat: 'agences-voyage', desc: 'Destinations exotiques' }
];

async function initialize() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  🚀 INITIALISATION COMPLÈTE               ║');
  console.log('╚════════════════════════════════════════════╝\n');

  try {
    console.log('1️⃣  Test de connexion...');
    await db.testConnection();

    console.log('\n2️⃣  Synchronisation des tables...');
    await db.syncDatabase(false, true);

    console.log('\n3️⃣  Création des rôles...');
    await db.createDefaultRoles();

    console.log('\n4️⃣  Création des catégories...');
    await db.createDefaultCategories();

    console.log('\n5️⃣  Création de l\'admin...');
    await createAdmin();

    console.log('\n6️⃣  Création de 10 clients...');
    await createClients();

    console.log('\n7️⃣  Création de 20 prestataires...');
    await createPrestataires();

    console.log('\n8️⃣  Création de promotions...');
    await createPromotions();

    const stats = await getStats();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  ✅ INITIALISATION TERMINÉE !             ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log('📊 Base de données créée:');
    console.log(`   - Users: ${stats.users}`);
    console.log(`   - Clients: ${stats.clients}`);
    console.log(`   - Prestataires: ${stats.prestataires}`);
    console.log(`   - Catégories: ${stats.categories}`);
    console.log(`   - Promotions: ${stats.promotions}\n`);
    console.log('🔑 Comptes de test:');
    console.log('   👨‍💼 Admin: admin@mesprivileges.fr / Admin123!');
    console.log('   👤 Client: marie.dupont@test.com / Client123!');
    console.log('   🏪 Prestataire: legourmetfrancais@test.com / Presta123!\n');

    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

async function createAdmin() {
  const adminRole = await db.Role.findOne({ where: { name: 'admin' } });
  const [admin, created] = await db.User.findOrCreate({
    where: { email: 'admin@mesprivileges.fr' },
    defaults: {
      email: 'admin@mesprivileges.fr',
      password: 'Admin123!',
      roleId: adminRole.id,
      isActive: true,
      isEmailVerified: true
    }
  });
  console.log(created ? '   ✅ Admin créé' : '   ⏭️  Admin existe');
}

async function createClients() {
  const clientRole = await db.Role.findOne({ where: { name: 'client' } });

  for (let i = 0; i < 10; i++) {
    const prenom = PRENOMS[i];
    const nom = NOMS[i];
    const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}@test.com`;

    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      console.log(`   ⏭️  ${prenom} ${nom} existe`);
      continue;
    }

    const user = await db.User.create({
      email,
      password: 'Client123!',
      roleId: clientRole.id,
      isActive: true,
      isEmailVerified: true
    });

    // IMPORTANT: Générer le QR code
    await db.Client.create({
      userId: user.id,
      qrCode: `QRC_${crypto.randomBytes(16).toString('hex')}`,
      prenom,
      nom,
      telephone: `06${Math.floor(10000000 + Math.random() * 90000000)}`
    });

    console.log(`   ✅ Client ${i + 1}/10: ${prenom} ${nom}`);
  }
}

async function createPrestataires() {
  const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
  const categories = await db.Category.findAll();

  for (let i = 0; i < COMMERCES.length; i++) {
    const commerce = COMMERCES[i];
    const ville = VILLES[i % VILLES.length];
    const email = `${commerce.nom.toLowerCase().replace(/[^a-z]/g, '')}@test.com`;

    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      console.log(`   ⏭️  ${commerce.nom} existe`);
      continue;
    }

    const category = categories.find(c => c.slug === commerce.cat);
    if (!category) continue;

    const user = await db.User.create({
      email,
      password: 'Presta123!',
      roleId: prestataireRole.id,
      isActive: true,
      isEmailVerified: true
    });

    await db.Prestataire.create({
      userId: user.id,
      nomCommerce: commerce.nom,
      typeCommerce: commerce.type,
      categoryId: category.id,
      descriptionCourte: commerce.desc,
      adresse: `${10 + i} Rue du Commerce`,
      codePostal: ville.cp,
      ville: ville.nom,
      latitude: ville.lat + (Math.random() - 0.5) * 0.01,
      longitude: ville.lon + (Math.random() - 0.5) * 0.01,
      imagePrincipale: `https://picsum.photos/800/600?random=${i}`,
      horaires: {
        lundi: { ouvert: true, heures: '09:00-19:00' },
        mardi: { ouvert: true, heures: '09:00-19:00' },
        mercredi: { ouvert: true, heures: '09:00-19:00' },
        jeudi: { ouvert: true, heures: '09:00-19:00' },
        vendredi: { ouvert: true, heures: '09:00-19:00' },
        samedi: { ouvert: true, heures: '10:00-18:00' },
        dimanche: { ouvert: false, heures: 'Fermé' }
      },
      estActif: true,
      estVerifie: true
    });

    console.log(`   ✅ ${i + 1}/20: ${commerce.nom}`);
  }
}

async function createPromotions() {
  const prestataires = await db.Prestataire.findAll({ limit: 10 });
  for (const presta of prestataires) {
    await db.Promotion.create({
      prestataireId: presta.id,
      titre: '10% de réduction',
      description: 'Offre de bienvenue',
      dateDebut: new Date(),
      dateFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      estActive: true
    });
  }
  console.log(`   ✅ 10 promotions créées`);
}

async function getStats() {
  return {
    users: await db.User.count(),
    clients: await db.Client.count(),
    prestataires: await db.Prestataire.count(),
    categories: await db.Category.count(),
    promotions: await db.Promotion.count()
  };
}

initialize();