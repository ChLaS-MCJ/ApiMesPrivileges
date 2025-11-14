// __tests__/user.test.js
const request = require('supertest');
const app = require('../server');
const db = require('../db.config');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

describe('🧪 USER TESTS', () => {
  let adminToken;
  let clientToken;
  let testUserId;

  // ==========================================
  // SETUP
  // ==========================================
  beforeAll(async () => {
    await db.syncDatabase(true);
    
    // ✅ CRÉER L'ADMIN avec hooks: false
    const adminRole = await db.Role.findOne({ where: { name: 'admin' } });
    const adminUser = await db.User.create({
      email: 'admin@test.com',
      password: await bcrypt.hash('Admin123!', 10),
      roleId: adminRole.id,
      isEmailVerified: true
    }, { hooks: false });

    // Login admin
    const adminLogin = await request(app)
      .post('/api/users/login')
      .send({ email: 'admin@test.com', password: 'Admin123!' });
    
    adminToken = adminLogin.body.data.token;
  });

  // ==========================================
  // 1. INSCRIPTION
  // ==========================================
  describe('POST /api/users/register', () => {
    test('✅ Devrait créer un nouveau client', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'client@test.com',
          password: 'Client123!',
          role: 'client',
          prenom: 'Jean',
          nom: 'Dupont',
          telephone: '0612345678'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('client@test.com');
      expect(res.body.data.token).toBeDefined();
      
      testUserId = res.body.data.user.id;
      clientToken = res.body.data.token;
    });

    test('❌ Devrait refuser un email déjà utilisé', async () => {
      // D'abord créer un compte
      await request(app)
        .post('/api/users/register')
        .send({
          email: 'duplicate@test.com',
          password: 'Test123!',
          prenom: 'Test',
          nom: 'User'
        });
      
      // Puis essayer de créer avec le même email
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'duplicate@test.com',
          password: 'Test123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('déjà utilisé');
    });

    test('❌ Devrait refuser un mot de passe faible', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'weak@test.com',
          password: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  // ==========================================
  // 2. CONNEXION
  // ==========================================
  describe('POST /api/users/login', () => {
    test('✅ Devrait connecter avec identifiants valides', async () => {
      // Créer un user avec hooks: false
      const clientRole = await db.Role.findOne({ where: { name: 'client' } });
      const loginUser = await db.User.create({
        email: 'login-test@test.com',
        password: await bcrypt.hash('LoginTest123!', 10),
        roleId: clientRole.id
      }, { hooks: false });

      // Créer profil client
      await db.Client.create({
        userId: loginUser.id,
        qrCode: `QRC_${crypto.randomBytes(16).toString('hex')}`,
        prenom: 'Login',
        nom: 'Test'
      });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'login-test@test.com',
          password: 'LoginTest123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    test('❌ Devrait refuser identifiants invalides', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'client@test.com',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 3. OAUTH
  // ==========================================
  describe('POST /api/users/google', () => {
    test('✅ Devrait créer/connecter avec Google', async () => {
      const res = await request(app)
        .post('/api/users/google')
        .send({
          googleId: 'google123456',
          email: 'google@test.com',
          prenom: 'Google',
          nom: 'User'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('POST /api/users/apple', () => {
    test('✅ Devrait créer/connecter avec Apple', async () => {
      const res = await request(app)
        .post('/api/users/apple')
        .send({
          appleId: 'apple123456',
          email: 'apple@test.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });

  // ==========================================
  // 4. PROFIL
  // ==========================================
  describe('GET /api/users/me', () => {
    test('✅ Devrait retourner le profil connecté', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('client@test.com');
    });

    test('❌ Devrait refuser sans token', async () => {
      const res = await request(app)
        .get('/api/users/me');

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 5. MISE À JOUR PROFIL
  // ==========================================
  describe('PUT /api/users/me', () => {
    test('✅ Devrait mettre à jour le profil', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          preferences: { theme: 'dark' }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 6. CHANGEMENT MOT DE PASSE
  // ==========================================
  describe('PUT /api/users/me/password', () => {
    test('✅ Devrait changer le mot de passe', async () => {
      // Créer un user avec hooks: false
      const clientRole = await db.Role.findOne({ where: { name: 'client' } });
      const passwordUser = await db.User.create({
        email: 'password-test@test.com',
        password: await bcrypt.hash('OldPassword123!', 10),
        roleId: clientRole.id
      }, { hooks: false });

      // Créer profil client
      await db.Client.create({
        userId: passwordUser.id,
        qrCode: `QRC_${crypto.randomBytes(16).toString('hex')}`,
        prenom: 'Password',
        nom: 'Test'
      });

      // Login
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'password-test@test.com', password: 'OldPassword123!' });

      const userToken = loginRes.body.data.token;

      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Vérifier qu'on peut se connecter avec le nouveau mot de passe
      const loginRes2 = await request(app)
        .post('/api/users/login')
        .send({
          email: 'password-test@test.com',
          password: 'NewPassword123!'
        });
      
      expect(loginRes2.status).toBe(200);
    });

    test('❌ Devrait refuser mauvais mot de passe actuel', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewClient123!'
        });

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 7. STATS
  // ==========================================
  describe('GET /api/users/me/stats', () => {
    test('✅ Devrait retourner les stats', async () => {
      const res = await request(app)
        .get('/api/users/me/stats')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  // ==========================================
  // 8. ADMIN - LISTE USERS
  // ==========================================
  describe('GET /api/users (ADMIN)', () => {
    test('✅ Admin devrait voir tous les users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
      expect(Array.isArray(res.body.data.users)).toBe(true);
    });

    test('❌ Client ne devrait pas voir la liste', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 9. ADMIN - BLACKLIST
  // ==========================================
  describe('POST /api/users/:id/blacklist (ADMIN)', () => {
    test('✅ Admin devrait pouvoir blacklister', async () => {
      const res = await request(app)
        .post(`/api/users/${testUserId}/blacklist`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          raison: 'Test de blacklist pour les tests unitaires'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('❌ User blacklisté ne peut plus se connecter', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'client@test.com',
          password: 'Client123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('bloqué');
    });
  });

  describe('DELETE /api/users/:id/blacklist (ADMIN)', () => {
    test('✅ Admin devrait pouvoir débloquer', async () => {
      const res = await request(app)
        .delete(`/api/users/${testUserId}/blacklist`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Refaire le login pour récupérer un nouveau token
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: 'client@test.com',
          password: 'Client123!'
        });
      
      if (loginRes.body.data) {
        clientToken = loginRes.body.data.token;
      }
    });
  });

  // ==========================================
  // 10. REFRESH TOKEN
  // ==========================================
  describe('POST /api/users/refresh-token', () => {
    test('✅ Devrait rafraîchir le token', async () => {
      // Créer un user avec hooks: false
      const clientRole = await db.Role.findOne({ where: { name: 'client' } });
      const refreshUser = await db.User.create({
        email: 'refresh@test.com',
        password: await bcrypt.hash('Refresh123!', 10),
        roleId: clientRole.id
      }, { hooks: false });

      // Créer profil client
      await db.Client.create({
        userId: refreshUser.id,
        qrCode: `QRC_${crypto.randomBytes(16).toString('hex')}`,
        prenom: 'Refresh',
        nom: 'Test'
      });

      // Faire un login pour avoir un refreshToken
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: 'refresh@test.com',
          password: 'Refresh123!'
        });

      expect(loginRes.body.data).toBeDefined();
      expect(loginRes.body.data.refreshToken).toBeDefined();

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });
  });

  // ==========================================
  // 11. SUPPRESSION COMPTE
  // ==========================================
  describe('DELETE /api/users/me', () => {
    test('✅ Devrait supprimer son compte', async () => {
      const res = await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});