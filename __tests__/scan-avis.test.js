// __tests__/scan-avis.test.js
const request = require('supertest');
const app = require('../server');
const db = require('../db.config');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

describe('📱 SCAN & ⭐ AVIS TESTS', () => {
  let clientToken;
  let prestataireToken;
  let clientQrCode;
  let promotionId;
  let scanId;
  let prestataireId;

  // ==========================================
  // SETUP
  // ==========================================
  beforeAll(async () => {
    await db.syncDatabase(true);

    // ✅ CRÉER PRESTATAIRE avec hooks: false
    const prestataireRole = await db.Role.findOne({ where: { name: 'prestataire' } });
    const prestataireUser = await db.User.create({
      email: 'presta@test.com',
      password: await bcrypt.hash('Presta123!', 10),
      roleId: prestataireRole.id,
      isEmailVerified: true
    }, { hooks: false });

    const category = await db.Category.findOne();
    
    const prestataire = await db.Prestataire.create({
      userId: prestataireUser.id,
      nomCommerce: 'Commerce Test',
      typeCommerce: 'Restaurant',
      categoryId: category.id,
      adresse: '123 Rue Test',
      codePostal: '75001',
      ville: 'Paris',
      latitude: 48.8566,
      longitude: 2.3522
    });
    prestataireId = prestataire.id;

    // Créer une promotion
    const promotion = await db.Promotion.create({
      prestataireId: prestataire.id,
      titre: 'Promo Test',
      description: 'Test promotion',
      dateDebut: new Date(),
      dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      estActive: true
    });
    promotionId = promotion.id;

    // Login prestataire
    const prestataireLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'presta@test.com', password: 'Presta123!' });
    
    if (!prestataireLogin.body.data) {
      console.error('❌ Erreur login prestataire:', prestataireLogin.body);
      throw new Error('Login prestataire échoué');
    }
    
    prestataireToken = prestataireLogin.body.data.token;

    // ✅ CRÉER CLIENT avec hooks: false
    const clientRole = await db.Role.findOne({ where: { name: 'client' } });
    const clientUser = await db.User.create({
      email: 'client-scan@test.com',
      password: await bcrypt.hash('Client123!', 10),
      roleId: clientRole.id
    }, { hooks: false });

    // Créer le profil Client avec QR code
    const client = await db.Client.create({
      userId: clientUser.id,
      qrCode: `QRC_${crypto.randomBytes(16).toString('hex')}`,
      prenom: 'Jean',
      nom: 'Test'
    });
    clientQrCode = client.qrCode;

    // Login client
    const clientLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'client-scan@test.com', password: 'Client123!' });
    
    if (!clientLogin.body.data) {
      console.error('❌ Erreur login client:', clientLogin.body);
      throw new Error('Login client échoué');
    }
    
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
      // Créer un autre client pour tester
      const anotherClientRole = await db.Role.findOne({ where: { name: 'client' } });
      const anotherClientUser = await db.User.create({
        email: 'client2-scan@test.com',
        password: await bcrypt.hash('Client123!', 10),
        roleId: anotherClientRole.id
      }, { hooks: false });
      
      const anotherClient = await db.Client.create({
        userId: anotherClientUser.id,
        qrCode: `QRC_${crypto.randomBytes(16).toString('hex')}`,
        prenom: 'Marie',
        nom: 'Test'
      });

      const res = await request(app)
        .post('/api/scans/scan')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          qrCode: anotherClient.qrCode,
          promotionId: promotionId
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // HISTORIQUE SCANS
  // ==========================================
  describe('📊 HISTORIQUE SCANS', () => {
    test('✅ Client devrait voir ses scans', async () => {
      const res = await request(app)
        .get('/api/scans/me')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.scans)).toBe(true);
      expect(res.body.data.scans.length).toBeGreaterThan(0);
    });

    test('✅ Prestataire devrait voir historique', async () => {
      const res = await request(app)
        .get('/api/scans/history')
        .set('Authorization', `Bearer ${prestataireToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.scans)).toBe(true);
    });
  });

  // ==========================================
  // STATS CLIENT
  // ==========================================
  describe('📈 STATS CLIENT', () => {
    test('✅ Devrait retourner stats client', async () => {
      const res = await request(app)
        .get('/api/users/me/stats')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
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
          note: 5,
          commentaire: 'Excellent!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avis).toBeDefined();
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
      expect(res.body.message).toContain('déjà noté');
    });

    test('❌ Note invalide devrait échouer', async () => {
      // Créer un nouveau scan pour tester
      const newPromotion = await db.Promotion.create({
        prestataireId: prestataireId,
        titre: 'Promo Test 2',
        description: 'Test promotion 2',
        dateDebut: new Date(),
        dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estActive: true
      });

      const newScanRes = await request(app)
        .post('/api/scans/scan')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({
          qrCode: clientQrCode,
          promotionId: newPromotion.id
        });

      if (newScanRes.body.data && newScanRes.body.data.scan) {
        const res = await request(app)
          .post('/api/avis')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            scanId: newScanRes.body.data.scan.id,
            note: 10 // Note invalide
          });

        expect(res.status).toBe(400);
      }
    });

    test('✅ Devrait lister avis d\'un prestataire', async () => {
      const res = await request(app)
        .get(`/api/avis/prestataire/${prestataireId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.avis)).toBe(true);
      expect(res.body.data.avis.length).toBeGreaterThan(0);
    });

    test('✅ Client devrait voir ses avis', async () => {
      const res = await request(app)
        .get('/api/avis/me')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Adapter selon la structure de réponse de votre API
      const avisArray = res.body.data.avis || res.body.data;
      expect(Array.isArray(avisArray)).toBe(true);
    });
  });
});