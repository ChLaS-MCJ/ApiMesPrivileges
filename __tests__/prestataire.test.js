// __tests__/prestataire.test.js
const request = require('supertest');
const app = require('../server');
const db = require('../db.config');
const bcrypt = require('bcryptjs');

describe('🏪 PRESTATAIRE TESTS', () => {
  let adminToken;
  let clientToken;
  let prestataireToken;
  let prestataireId;
  let categoryId;

  // ==========================================
  // SETUP
  // ==========================================
  beforeAll(async () => {
    await db.syncDatabase(true);

    // Récupérer une catégorie
    const category = await db.Category.findOne();
    categoryId = category.id;

    // ✅ CRÉER ADMIN avec hooks: false
    const adminRole = await db.Role.findOne({ where: { name: 'admin' } });
    await db.User.create({
      email: 'admin@test.com',
      password: await bcrypt.hash('Admin123!', 10),
      roleId: adminRole.id,
      isEmailVerified: true
    }, { hooks: false });

    const adminLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'admin@test.com', password: 'Admin123!' });
    
    if (!adminLogin.body.data) {
      console.error('❌ Erreur login admin:', adminLogin.body);
      throw new Error('Login admin échoué');
    }
    
    adminToken = adminLogin.body.data.token;

    // ✅ CRÉER CLIENT avec hooks: false
    const clientRole = await db.Role.findOne({ where: { name: 'client' } });
    const clientUser = await db.User.create({
      email: 'client@test.com',
      password: await bcrypt.hash('Client123!', 10),
      roleId: clientRole.id
    }, { hooks: false });

    // Créer le profil Client avec QR code
    const crypto = require('crypto');
    await db.Client.create({
      userId: clientUser.id,
      qrCode: `QRC_${crypto.randomBytes(16).toString('hex')}`,
      prenom: 'Client',
      nom: 'Test'
    });

    const clientLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'client@test.com', password: 'Client123!' });
    
    if (!clientLogin.body.data) {
      console.error('❌ Erreur login client:', clientLogin.body);
      throw new Error('Login client échoué');
    }
    
    clientToken = clientLogin.body.data.token;
  });

  // ==========================================
  // CRÉATION PRESTATAIRE
  // ==========================================
  describe('POST /api/prestataires', () => {
    test('✅ Devrait créer un commerce', async () => {
      // Admin peut créer un prestataire mais doit aussi créer le user prestataire
      // Créer d'abord un user prestataire
      const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
      const newPrestataireUser = await db.User.create({
        email: 'commerce@test.com',
        password: await bcrypt.hash('Commerce123!', 10),
        roleId: prestataireRole.id,
        isEmailVerified: true
      }, { hooks: false });

      // Login avec ce user
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: 'commerce@test.com',
          password: 'Commerce123!'
        });

      const prestToken = loginRes.body.data.token;

      // Créer le commerce en tant que prestataire
      const res = await request(app)
        .post('/api/prestataires')
        .set('Authorization', `Bearer ${prestToken}`)
        .send({
          nomCommerce: 'Test Commerce',
          typeCommerce: 'Restaurant',
          categoryId: categoryId,
          adresse: '123 Rue de Test',
          codePostal: '75001',
          ville: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522,
          telephone: '0123456789',
          description: 'Un commerce de test'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      // La réponse peut avoir différentes structures
      const prestataire = res.body.data.prestataire || res.body.data;
      expect(prestataire).toBeDefined();
      
      prestataireId = prestataire.id;
      prestataireToken = prestToken;
    });

    test('❌ Client ne peut pas créer de commerce', async () => {
      const res = await request(app)
        .post('/api/prestataires')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          nomCommerce: 'Fake Commerce',
          typeCommerce: 'Restaurant',
          categoryId: categoryId,
          adresse: '123 Rue',
          codePostal: '75001',
          ville: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // LISTE PUBLIQUE
  // ==========================================
  describe('GET /api/prestataires', () => {
    test('✅ Devrait retourner la liste publique', async () => {
      const res = await request(app)
        .get('/api/prestataires');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.prestataires)).toBe(true);
    });

    test('✅ Devrait filtrer par ville', async () => {
      // S'assurer qu'il y a un prestataire à Paris
      const existingParis = await db.Prestataire.findOne({ 
        where: { ville: 'Paris' } 
      });
      
      if (!existingParis) {
        // Créer un user prestataire pour Paris
        const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
        await db.User.create({
          email: 'paris@test.com',
          password: await bcrypt.hash('Paris123!', 10),
          roleId: prestataireRole.id,
          isEmailVerified: true
        }, { hooks: false });

        const parisLogin = await request(app)
          .post('/api/users/login')
          .send({ email: 'paris@test.com', password: 'Paris123!' });

        const parisToken = parisLogin.body.data.token;

        // Créer un prestataire à Paris
        await request(app)
          .post('/api/prestataires')
          .set('Authorization', `Bearer ${parisToken}`)
          .send({
            nomCommerce: 'Commerce Paris',
            typeCommerce: 'Restaurant',
            categoryId: categoryId,
            adresse: '456 Rue de Paris',
            codePostal: '75002',
            ville: 'Paris',
            latitude: 48.8566,
            longitude: 2.3522,
            telephone: '0123456790',
            email: 'paris@test.com'
          });
      }

      const res = await request(app)
        .get('/api/prestataires')
        .query({ ville: 'Paris' });

      expect(res.status).toBe(200);
      expect(res.body.data.prestataires.length).toBeGreaterThan(0);
      
      // Vérifier que tous les résultats sont bien de Paris
      res.body.data.prestataires.forEach(p => {
        expect(p.ville).toBe('Paris');
      });
    });
  });

  // ==========================================
  // DÉTAILS PRESTATAIRE
  // ==========================================
  describe('GET /api/prestataires/:id', () => {
    test('✅ Devrait retourner les détails', async () => {
      if (!prestataireId) {
        // Créer un prestataire si pas encore fait
        const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
        await db.User.create({
          email: 'details@test.com',
          password: await bcrypt.hash('Details123!', 10),
          roleId: prestataireRole.id,
          isEmailVerified: true
        }, { hooks: false });

        const detailsLogin = await request(app)
          .post('/api/users/login')
          .send({ email: 'details@test.com', password: 'Details123!' });

        const detailsToken = detailsLogin.body.data.token;

        const createRes = await request(app)
          .post('/api/prestataires')
          .set('Authorization', `Bearer ${detailsToken}`)
          .send({
            nomCommerce: 'Test Details',
            typeCommerce: 'Restaurant',
            categoryId: categoryId,
            adresse: '789 Rue',
            codePostal: '75003',
            ville: 'Paris',
            latitude: 48.8566,
            longitude: 2.3522,
            telephone: '0123456791',
            email: 'details@test.com'
          });
        
        if (createRes.body.data && createRes.body.data.prestataire) {
          prestataireId = createRes.body.data.prestataire.id;
        }
      }

      const res = await request(app)
        .get(`/api/prestataires/${prestataireId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nomCommerce).toBeDefined();
    });

    test('✅ Devrait incrémenter les visites', async () => {
      // Première visite
      await request(app)
        .get(`/api/prestataires/${prestataireId}`);

      // Deuxième visite
      const res = await request(app)
        .get(`/api/prestataires/${prestataireId}`);

      expect(res.body.data.nombreVisitesFiche).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // MON COMMERCE (PRESTATAIRE)
  // ==========================================
  describe('GET /api/prestataires/me/info', () => {
    test('✅ Devrait retourner mon commerce', async () => {
      if (!prestataireToken) {
        console.log('⚠️ prestataireToken non disponible, skip test');
        return;
      }

      const res = await request(app)
        .get('/api/prestataires/me/info')
        .set('Authorization', `Bearer ${prestataireToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // MODIFICATION COMMERCE
  // ==========================================
  describe('PUT /api/prestataires/me', () => {
    test('✅ Devrait modifier mon commerce', async () => {
      if (!prestataireToken) {
        console.log('⚠️ prestataireToken non disponible, skip test');
        return;
      }

      const res = await request(app)
        .put('/api/prestataires/me')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          nomCommerce: 'Commerce Modifié',
          description: 'Description mise à jour'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.nomCommerce).toBe('Commerce Modifié');
    });
  });

  // ==========================================
  // IMAGES
  // ==========================================
  describe('POST /api/prestataires/me/images', () => {
    test('✅ Devrait ajouter une image', async () => {
      if (!prestataireToken) {
        console.log('⚠️ prestataireToken non disponible, skip test');
        return;
      }

      const res = await request(app)
        .post('/api/prestataires/me/images')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          url: 'https://example.com/image.jpg'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('❌ Devrait refuser plus de 5 images', async () => {
      if (!prestataireToken) {
        console.log('⚠️ prestataireToken non disponible, skip test');
        return;
      }

      // Ajouter 4 images supplémentaires (on en a déjà 1)
      for (let i = 2; i <= 5; i++) {
        await request(app)
          .post('/api/prestataires/me/images')
          .set('Authorization', `Bearer ${prestataireToken}`)
          .send({ url: `https://example.com/image${i}.jpg` });
      }

      // Essayer d'ajouter la 6ème
      const res = await request(app)
        .post('/api/prestataires/me/images')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({ url: 'https://example.com/image6.jpg' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('5 images');
    });
  });

  // ==========================================
  // RECHERCHE PROXIMITÉ
  // ==========================================
  describe('GET /api/prestataires/search/nearby', () => {
    test('✅ Devrait trouver commerces proches', async () => {
      const res = await request(app)
        .get('/api/prestataires/search/nearby')
        .query({
          latitude: 48.8566,
          longitude: 2.3522,
          rayon: 10 // 10 km
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.prestataires)).toBe(true);
    });
  });

  // ==========================================
  // STATS PRESTATAIRE
  // ==========================================
  describe('GET /api/prestataires/me/stats', () => {
    test('✅ Devrait retourner les stats', async () => {
      if (!prestataireToken) {
        console.log('⚠️ prestataireToken non disponible, skip test');
        return;
      }

      const res = await request(app)
        .get('/api/prestataires/me/stats')
        .set('Authorization', `Bearer ${prestataireToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.nombreVisitesFiche).toBeDefined();
    });
  });
});