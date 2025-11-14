const request = require('supertest');
const app = require('../server');
const db = require('../db.config');

describe('📱 SCAN & ⭐ AVIS TESTS', () => {
  let prestataireToken;
  let clientToken;
  let prestataireId;
  let promotionId;
  let clientQrCode;
  let scanId;

  beforeAll(async () => {
    await db.syncDatabase(true);

    // Créer catégorie
    const category = await db.Category.create({
      nom: 'Test Category',
      slug: 'test-category'
    });

    // Créer prestataire
    const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
    const prestataireUser = await db.User.create({
      email: 'presta@test.com',
      password: 'Presta123!',
      roleId: prestataireRole.id
    });

    const prestataireLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'presta@test.com', password: 'Presta123!' });
    prestataireToken = prestataireLogin.body.data.token;

    const prestataire = await db.Prestataire.create({
	  userId: prestataireUser.id,
	  nomCommerce: 'Test Commerce',
	  typeCommerce: 'restaurant',
	  categoryId: category.id,
	  adresse: '123 Rue Test',
	  codePostal: '75001',
	  ville: 'Paris',
	  latitude: 48.8566,
	  longitude: 2.3522
	});
    prestataireId = prestataire.id;

    // Créer promotion
    const promotion = await db.Promotion.create({
      prestataireId: prestataire.id,
      titre: 'Promo Test',
      description: 'Test promo',
      dateDebut: new Date(),
      dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      estActive: true
    });
    promotionId = promotion.id;

    // Créer client
    const clientRole = await db.Role.findOne({ where: { name: 'client' } });
    const clientUser = await db.User.create({
      email: 'client@test.com',
      password: 'Client123!',
      roleId: clientRole.id
    });

    const client = await db.Client.create({
      userId: clientUser.id,
      prenom: 'Jean',
      nom: 'Test'
    });
    clientQrCode = client.qrCode;

    const clientLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'client@test.com', password: 'Client123!' });
    clientToken = clientLogin.body.data.token;
  });

  // ==========================================
  // SCAN TESTS
  // ==========================================
  describe('📱 SCAN QR CODE', () => {
    test('✅ Prestataire devrait scanner QR code client', async () => {
      const res = await request(app)
        .post('/api/scans/scan')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          qrCode: clientQrCode,
          promotionId: promotionId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scan).toBeDefined();
      
      scanId = res.body.data.scan.id;
    });

    test('❌ Ne devrait pas scanner 2 fois la même promo', async () => {
      const res = await request(app)
        .post('/api/scans/scan')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          qrCode: clientQrCode,
          promotionId: promotionId
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('déjà été utilisée');
    });

    test('❌ QR code invalide devrait échouer', async () => {
      const res = await request(app)
        .post('/api/scans/scan')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          qrCode: 'INVALID_QR',
          promotionId: promotionId
        });

      expect(res.status).toBe(404);
    });

    test('❌ Client ne peut pas scanner', async () => {
      const res = await request(app)
        .post('/api/scans/scan')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          qrCode: clientQrCode,
          promotionId: promotionId
        });

      expect(res.status).toBe(403);
    });
  });

  describe('📊 HISTORIQUE SCANS', () => {
    test('✅ Client devrait voir ses scans', async () => {
      const res = await request(app)
        .get('/api/scans/me')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scans.length).toBeGreaterThan(0);
    });

    test('✅ Prestataire devrait voir historique', async () => {
      const res = await request(app)
        .get('/api/scans/history')
        .set('Authorization', `Bearer ${prestataireToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('📈 STATS CLIENT', () => {
    test('✅ Devrait retourner stats client', async () => {
      const res = await request(app)
        .get('/api/scans/me/stats')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.nombreScans).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // AVIS TESTS
  // ==========================================
  describe('⭐ AVIS', () => {
    test('✅ Client devrait laisser un avis', async () => {
      const res = await request(app)
        .post('/api/avis')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          scanId: scanId,
          note: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avis.note).toBe(5);
    });

    test('❌ Ne peut pas noter 2 fois le même scan', async () => {
      const res = await request(app)
        .post('/api/avis')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          scanId: scanId,
          note: 4
        });

      expect(res.status).toBe(400);
    });

    test('❌ Note invalide devrait échouer', async () => {
      const res = await request(app)
        .post('/api/avis')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          scanId: scanId,
          note: 10
        });

      expect(res.status).toBe(400);
    });

    test('✅ Devrait lister avis d\'un prestataire', async () => {
      const res = await request(app)
        .get(`/api/avis/prestataire/${prestataireId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avis.length).toBeGreaterThan(0);
    });

    test('✅ Client devrait voir ses avis', async () => {
      const res = await request(app)
        .get('/api/avis/me')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
