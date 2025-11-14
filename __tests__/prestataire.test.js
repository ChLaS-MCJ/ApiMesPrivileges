const request = require('supertest');
const app = require('../server');
const db = require('../db.config');

describe('🏪 PRESTATAIRE TESTS', () => {
  let prestataireToken;
  let clientToken;
  let prestataireId;
  let categoryId;

  beforeAll(async () => {
    await db.syncDatabase(true);

    // Créer catégorie
    const category = await db.Category.create({
      nom: 'Test Category',
      slug: 'test-category',
      icon: '🏪'
    });
    categoryId = category.id;

    // Créer prestataire user
    const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
    const prestataireUser = await db.User.create({
      email: 'prestataire@test.com',
      password: 'Presta123!',
      roleId: prestataireRole.id,
      isEmailVerified: true
    });

    // Login
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'prestataire@test.com', password: 'Presta123!' });
    
    prestataireToken = loginRes.body.data.token;

    // Créer client
    const clientRole = await db.Role.findOne({ where: { name: 'client' } });
    await db.User.create({
      email: 'client@test.com',
      password: 'Client123!',
      roleId: clientRole.id
    });

    const clientLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'client@test.com', password: 'Client123!' });
    
    clientToken = clientLogin.body.data.token;
  });

  // ==========================================
  // 1. CRÉER COMMERCE
  // ==========================================
  describe('POST /api/prestataires', () => {
    test('✅ Devrait créer un commerce', async () => {
      const res = await request(app)
        .post('/api/prestataires')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          nomCommerce: 'Test Commerce',
          typeCommerce: 'restaurant',
          categoryId: categoryId,
          adresse: '123 Rue Test',
          codePostal: '75001',
          ville: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522,
          descriptionCourte: 'Un super commerce de test'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nomCommerce).toBe('Test Commerce');
      
      prestataireId = res.body.data.id;
    });

    test('❌ Client ne peut pas créer de commerce', async () => {
      const res = await request(app)
        .post('/api/prestataires')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          nomCommerce: 'Test',
          categoryId: categoryId
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 2. LISTE PUBLIQUE
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
      const res = await request(app)
        .get('/api/prestataires?ville=Paris');

      expect(res.status).toBe(200);
      expect(res.body.data.prestataires.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 3. DÉTAILS COMMERCE
  // ==========================================
  describe('GET /api/prestataires/:id', () => {
    test('✅ Devrait retourner les détails', async () => {
      const res = await request(app)
        .get(`/api/prestataires/${prestataireId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nomCommerce).toBe('Test Commerce');
    });

    test('✅ Devrait incrémenter les visites', async () => {
      await request(app).get(`/api/prestataires/${prestataireId}`);
      await request(app).get(`/api/prestataires/${prestataireId}`);
      
      const res = await request(app)
        .get(`/api/prestataires/${prestataireId}`);

      expect(res.body.data.nombreVisitesFiche).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 4. MON COMMERCE
  // ==========================================
  describe('GET /api/prestataires/me/info', () => {
    test('✅ Devrait retourner mon commerce', async () => {
      const res = await request(app)
        .get('/api/prestataires/me/info')
        .set('Authorization', `Bearer ${prestataireToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 5. MODIFIER COMMERCE
  // ==========================================
  describe('PUT /api/prestataires/me', () => {
    test('✅ Devrait modifier mon commerce', async () => {
      const res = await request(app)
        .put('/api/prestataires/me')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          nomCommerce: 'Commerce Modifié',
          descriptionCourte: 'Nouvelle description'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.nomCommerce).toBe('Commerce Modifié');
    });
  });

  // ==========================================
  // 6. AJOUTER IMAGE
  // ==========================================
  describe('POST /api/prestataires/me/images', () => {
    test('✅ Devrait ajouter une image', async () => {
      const res = await request(app)
        .post('/api/prestataires/me/images')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          url: 'https://example.com/image1.jpg'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('❌ Devrait refuser plus de 5 images', async () => {
      for (let i = 2; i <= 5; i++) {
        await request(app)
          .post('/api/prestataires/me/images')
          .set('Authorization', `Bearer ${prestataireToken}`)
          .send({ url: `https://example.com/image${i}.jpg` });
      }

      const res = await request(app)
        .post('/api/prestataires/me/images')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({ url: 'https://example.com/image6.jpg' });

      expect(res.status).toBe(500);
    });
  });

  // ==========================================
  // 7. RECHERCHE GPS
  // ==========================================
  describe('GET /api/prestataires/search/nearby', () => {
    test('✅ Devrait trouver commerces proches', async () => {
      const res = await request(app)
        .get('/api/prestataires/search/nearby')
        .query({
          latitude: 48.8566,
          longitude: 2.3522,
          rayon: 10
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 8. STATS
  // ==========================================
  describe('GET /api/prestataires/me/stats', () => {
    test('✅ Devrait retourner les stats', async () => {
      const res = await request(app)
        .get('/api/prestataires/me/stats')
        .set('Authorization', `Bearer ${prestataireToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.nombreVisitesFiche).toBeDefined();
    });
  });
});
