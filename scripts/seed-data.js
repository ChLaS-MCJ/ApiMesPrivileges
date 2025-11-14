/**
 * Script de génération de données de test
 * 10 clients + 20 prestataires
 */

const db = require('../db.config');

// Données réalistes
const PRENOMS = ['Marie', 'Jean', 'Sophie', 'Pierre', 'Julie', 'Thomas', 'Emma', 'Lucas', 'Léa', 'Nicolas', 'Chloé', 'Alexandre', 'Camille', 'Maxime', 'Laura'];
const NOMS = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel'];

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
  // RESTAURANTS
  { nom: 'Le Gourmet Français', type: 'restaurant', category: 'restaurants', desc: 'Cuisine française traditionnelle avec des produits du terroir' },
  { nom: 'Sushi Paradise', type: 'restaurant', category: 'restaurants', desc: 'Restaurant japonais authentique, sushi frais tous les jours' },
  { nom: 'Pizzeria Bella Vita', type: 'restaurant', category: 'restaurants', desc: 'Pizzas italiennes au feu de bois' },
  { nom: 'Le Bistrot du Coin', type: 'restaurant', category: 'restaurants', desc: 'Ambiance conviviale, plats du jour faits maison' },
  
  // HOTELS
  { nom: 'Hôtel des Alpes', type: 'hotel', category: 'hotels', desc: 'Hôtel 4 étoiles avec vue panoramique' },
  { nom: 'Le Palace Royal', type: 'hotel', category: 'hotels', desc: 'Hôtel de luxe en centre-ville' },
  { nom: 'Auberge du Lac', type: 'hotel', category: 'hotels', desc: 'Hébergement chaleureux en bord de lac' },
  
  // MODE
  { nom: 'Fashion Boutique', type: 'magasin', category: 'mode-vetements', desc: 'Vêtements tendance pour femmes et hommes' },
  { nom: 'Style & Chic', type: 'magasin', category: 'mode-vetements', desc: 'Boutique de prêt-à-porter haut de gamme' },
  { nom: 'Urban Wear', type: 'magasin', category: 'mode-vetements', desc: 'Mode urbaine et streetwear' },
  { nom: 'La Garde-Robe', type: 'magasin', category: 'mode-vetements', desc: 'Vêtements élégants et accessoires' },
  
  // BEAUTÉ
  { nom: 'Spa Zen Attitude', type: 'spa', category: 'beaute-spa', desc: 'Soins du corps, massages relaxants' },
  { nom: 'Salon Coiffure Élégance', type: 'salon', category: 'beaute-spa', desc: 'Coiffure et coloration professionnelle' },
  { nom: 'Beauty Center', type: 'institut', category: 'beaute-spa', desc: 'Institut de beauté complet' },
  
  // SPORT
  { nom: 'FitZone Gym', type: 'salle-sport', category: 'sport-fitness', desc: 'Salle de sport équipée, cours collectifs' },
  { nom: 'Yoga Studio', type: 'studio', category: 'sport-fitness', desc: 'Cours de yoga tous niveaux' },
  
  // HIGH-TECH
  { nom: 'Tech Store', type: 'magasin', category: 'high-tech', desc: 'Smartphones, ordinateurs et accessoires' },
  { nom: 'Gaming Zone', type: 'magasin', category: 'high-tech', desc: 'Matériel gaming et consoles' },
  
  // AGENCES
  { nom: 'Voyages Passion', type: 'agence-voyage', category: 'agences-voyage', desc: 'Agence de voyages sur mesure' },
  { nom: 'Évasion Tropicale', type: 'agence-voyage', category: 'agences-voyage', desc: 'Spécialiste des destinations exotiques' }
];

/**
 * Génère 10 clients
 */
async function createClients() {
  console.log('\n👥 Création de 10 clients...\n');
  
  try {
    const clientRole = await db.Role.findOne({ where: { name: 'client' } });
    
    for (let i = 1; i <= 10; i++) {
      const prenom = PRENOMS[i % PRENOMS.length];
      const nom = NOMS[i % NOMS.length];
      const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}${i}@test.com`;
      
      // Vérifier si existe
      const existing = await db.User.findOne({ where: { email } });
      if (existing) {
        console.log(`⏭️  ${prenom} ${nom} existe déjà`);
        continue;
      }
      
      // Créer user
      const user = await db.User.create({
        email: email,
        password: 'Client123!',
        roleId: clientRole.id,
        isEmailVerified: true,
        isActive: true
      });
      
      // Créer profil client
      await db.Client.create({
        userId: user.id,
        prenom: prenom,
        nom: nom,
        telephone: `06${Math.floor(10000000 + Math.random() * 90000000)}`
      });
      
      console.log(`✅ Client ${i}/10: ${prenom} ${nom} (${email})`);
    }
    
    console.log('\n✅ 10 clients créés avec succès!\n');
    
  } catch (error) {
    console.error('❌ Erreur création clients:', error.message);
  }
}

/**
 * Génère 20 prestataires
 */
async function createPrestataires() {
  console.log('\n🏪 Création de 20 prestataires...\n');
  
  try {
    const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
    const categories = await db.Category.findAll();
    
    if (categories.length === 0) {
      console.log('❌ Aucune catégorie trouvée');
      return;
    }
    
    for (let i = 0; i < COMMERCES.length && i < 20; i++) {
      const commerce = COMMERCES[i];
      const ville = VILLES[i % VILLES.length];
      const email = `${commerce.nom.toLowerCase().replace(/[^a-z]/g, '')}@test.com`;
      
      // Vérifier si existe
      const existing = await db.User.findOne({ where: { email } });
      if (existing) {
        console.log(`⏭️  ${commerce.nom} existe déjà`);
        continue;
      }
      
      // Trouver la catégorie
      const category = categories.find(c => c.slug === commerce.category);
      if (!category) {
        console.log(`⚠️  Catégorie ${commerce.category} non trouvée pour ${commerce.nom}`);
        continue;
      }
      
      // Créer user
      const user = await db.User.create({
        email: email,
        password: 'Presta123!',
        roleId: prestataireRole.id,
        isEmailVerified: true,
        isActive: true
      });
      
      // Créer prestataire
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
      
      console.log(`✅ Prestataire ${i + 1}/20: ${commerce.nom} (${ville.nom})`);
    }
    
    console.log('\n✅ 20 prestataires créés avec succès!\n');
    
  } catch (error) {
    console.error('❌ Erreur création prestataires:', error.message);
  }
}

/**
 * Script principal
 */
async function seed() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  🌱 SEED DATABASE - 10 + 20               ║');
  console.log('╚════════════════════════════════════════════╝');
  
  try {
    // Test connexion
    console.log('\n🔌 Test de connexion...');
    await db.testConnection();
    
    // Vérifier que les rôles existent
    const clientRole = await db.Role.findOne({ where: { name: 'client' } });
    const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
    
    if (!clientRole || !prestataireRole) {
      console.log('\n❌ Les rôles n\'existent pas. Lance d\'abord: npm run init\n');
      process.exit(1);
    }
    
    // Créer clients
    await createClients();
    
    // Créer prestataires
    await createPrestataires();
    
    // Stats finales
    const totalUsers = await db.User.count();
    const totalClients = await db.Client.count();
    const totalPrestataires = await db.Prestataire.count();
    
    console.log('\n');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ✅ SEED TERMINÉ AVEC SUCCÈS              ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('\n');
    console.log('📊 Statistiques de la BDD:');
    console.log(`   - Users total: ${totalUsers}`);
    console.log(`   - Clients: ${totalClients}`);
    console.log(`   - Prestataires: ${totalPrestataires}`);
    console.log('\n');
    console.log('🔑 Tous les mots de passe:');
    console.log('   - Clients: Client123!');
    console.log('   - Prestataires: Presta123!');
    console.log('\n');
    console.log('💡 Pour tester:');
    console.log('   Client: marie.dupont1@test.com / Client123!');
    console.log('   Prestataire: legourmetfrancais@test.com / Presta123!');
    console.log('\n');
    
    await db.sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

// Lancer le seed
seed();
