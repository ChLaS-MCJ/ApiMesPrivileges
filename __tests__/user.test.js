const request = require('supertest');
const app = require('../server');
const db = require('../db.config');

describe('🧪 USER TESTS', () => {
  let adminToken;
  let clientToken;
  let prestataireToken;
  let testUserId;

  // ==========================================
  // SETUP
  // ==========================================
  beforeAll(async () => {
    await db.syncDatabase(true);
    
    // Créer un admin pour les tests admin
    const adminRole = await db.Role.findOne({ where: { name: 'admin' } });
    const adminUser = await db.User.create({
      email: 'admin@test.com',
      password: 'Admin123!',
      roleId: adminRole.id,
      isEmailVerified: true
    });

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
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: 'client@test.com',
          password: 'Client123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
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
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'client@test.com',
          password: 'Client123!'
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
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 3. CONNEXION GOOGLE
  // ==========================================
  describe('POST /api/users/google', () => {
    test('✅ Devrait créer/connecter avec Google', async () => {
      const res = await request(app)
        .post('/api/users/google')
        .send({
          googleId: 'google123456',
          email: 'google@test.com',
          nom: 'Google',
          prenom: 'User'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });

  // ==========================================
  // 4. CONNEXION APPLE
  // ==========================================
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
  // 5. PROFIL
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
  // 6. MISE À JOUR PROFIL
  // ==========================================
  describe('PUT /api/users/me', () => {
    test('✅ Devrait mettre à jour le profil', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          preferences: {
            langue: 'fr',
            notifications: true
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 7. CHANGEMENT MOT DE PASSE
  // ==========================================
  describe('PUT /api/users/me/password', () => {
    test('✅ Devrait changer le mot de passe', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          currentPassword: 'Client123!',
          newPassword: 'NewClient123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('❌ Devrait refuser mauvais mot de passe actuel', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewClient123!'
        });

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 8. STATS
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
  // 9. ADMIN - LISTE USERS
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
  // 10. ADMIN - BLACKLIST
  // ==========================================
  describe('POST /api/users/:id/blacklist (ADMIN)', () => {
    test('✅ Admin devrait pouvoir blacklister', async () => {
      const res = await request(app)
        .post(`/api/users/${testUserId}/blacklist`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          raison: 'Comportement inapproprié test'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('❌ User blacklisté ne peut plus se connecter', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'client@test.com',
          password: 'NewClient123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('bloqué');
    });
  });

  // ==========================================
  // 11. ADMIN - UNBLACKLIST
  // ==========================================
  describe('DELETE /api/users/:id/blacklist (ADMIN)', () => {
    test('✅ Admin devrait pouvoir débloquer', async () => {
      const res = await request(app)
        .delete(`/api/users/${testUserId}/blacklist`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // 12. REFRESH TOKEN
  // ==========================================
  describe('POST /api/users/refresh-token', () => {
    test('✅ Devrait rafraîchir le token', async () => {
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: 'client@test.com',
          password: 'NewClient123!'
        });

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/users/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });

  // ==========================================
  // 13. SUPPRESSION COMPTE
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
