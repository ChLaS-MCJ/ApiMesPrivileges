// db.config.js
require('dotenv').config();

const { Sequelize, DataTypes } = require('sequelize');

// Détection de l'environnement
const isTest = process.env.NODE_ENV === 'test';

// Configuration selon l'environnement
const dbConfig = isTest ? {
  host: process.env.DB_HOST_TEST,
  user: process.env.DB_USER_TEST,
  password: process.env.DB_PASSWORD_TEST,
  database: process.env.DB_NAME_TEST,
  port: process.env.DB_PORT_TEST || 3306,
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
} : {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  logging: console.log,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
};

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

// Afficher la config en mode test
if (isTest) {
  console.log(`🧪 Mode TEST - BDD: ${dbConfig.database}`);
}

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ==========================================
// IMPORT DES MODÈLES
// ==========================================

// Système de base
db.Role = require('./models/Role')(sequelize);
db.User = require('./models/User')(sequelize);

// Profils utilisateurs
db.Client = require('./models/Client')(sequelize);
db.Prestataire = require('./models/Prestataire')(sequelize);

// Gestion des commerces
db.Category = require('./models/Category')(sequelize);
db.Promotion = require('./models/Promotion')(sequelize);

// Système QR Code
db.Scan = require('./models/Scan')(sequelize);
db.Avis = require('./models/Avis')(sequelize);

// ==========================================
// RELATIONS SYSTÈME DE BASE
// ==========================================

// User <-> Role (Many-to-One)
db.User.belongsTo(db.Role, { 
    foreignKey: 'roleId', 
    as: 'role' 
});
db.Role.hasMany(db.User, { 
    foreignKey: 'roleId', 
    onDelete: 'NO ACTION' 
});

// ==========================================
// RELATIONS PROFILS
// ==========================================

// User <-> Client (One-to-One)
db.User.hasOne(db.Client, {
    foreignKey: 'userId',
    as: 'client',
    onDelete: 'CASCADE'
});
db.Client.belongsTo(db.User, {
    foreignKey: 'userId',
    as: 'user'
});

// User <-> Prestataire (One-to-One)
db.User.hasOne(db.Prestataire, {
    foreignKey: 'userId',
    as: 'prestataire',
    onDelete: 'CASCADE'
});
db.Prestataire.belongsTo(db.User, {
    foreignKey: 'userId',
    as: 'user'
});

// ==========================================
// RELATIONS COMMERCES
// ==========================================

// Prestataire <-> Category (Many-to-One)
db.Prestataire.belongsTo(db.Category, {
    foreignKey: 'categoryId',
    as: 'category'
});
db.Category.hasMany(db.Prestataire, {
    foreignKey: 'categoryId',
    as: 'prestataires'
});

// Category <-> Category (Self-referencing pour sous-catégories)
db.Category.hasMany(db.Category, {
    foreignKey: 'parentId',
    as: 'sousCategories'
});
db.Category.belongsTo(db.Category, {
    foreignKey: 'parentId',
    as: 'parent'
});

// ==========================================
// RELATIONS PROMOTIONS
// ==========================================

// Prestataire <-> Promotion (One-to-Many)
db.Prestataire.hasMany(db.Promotion, {
    foreignKey: 'prestataireId',
    as: 'promotions',
    onDelete: 'CASCADE'
});
db.Promotion.belongsTo(db.Prestataire, {
    foreignKey: 'prestataireId',
    as: 'prestataire'
});

// ==========================================
// RELATIONS SCANS QR CODE
// ==========================================

// User <-> Scan (One-to-Many) - Client qui scanne
db.User.hasMany(db.Scan, {
    foreignKey: 'userId',
    as: 'scans',
    onDelete: 'CASCADE'
});
db.Scan.belongsTo(db.User, {
    foreignKey: 'userId',
    as: 'client'
});

// Prestataire <-> Scan (One-to-Many) - Commerce qui scanne
db.Prestataire.hasMany(db.Scan, {
    foreignKey: 'prestataireId',
    as: 'scans',
    onDelete: 'CASCADE'
});
db.Scan.belongsTo(db.Prestataire, {
    foreignKey: 'prestataireId',
    as: 'prestataire'
});

// Promotion <-> Scan (One-to-Many)
db.Promotion.hasMany(db.Scan, {
    foreignKey: 'promotionId',
    as: 'scans',
    onDelete: 'RESTRICT'
});
db.Scan.belongsTo(db.Promotion, {
    foreignKey: 'promotionId',
    as: 'promotion'
});

// ==========================================
// RELATIONS AVIS
// ==========================================

// Prestataire <-> Avis (One-to-Many)
db.Prestataire.hasMany(db.Avis, {
    foreignKey: 'prestataireId',
    as: 'avis',
    onDelete: 'CASCADE'
});
db.Avis.belongsTo(db.Prestataire, {
    foreignKey: 'prestataireId',
    as: 'prestataire'
});

// User <-> Avis (One-to-Many) - Client qui donne l'avis
db.User.hasMany(db.Avis, {
    foreignKey: 'userId',
    as: 'avis',
    onDelete: 'CASCADE'
});
db.Avis.belongsTo(db.User, {
    foreignKey: 'userId',
    as: 'client'
});

// Scan <-> Avis (One-to-One) - Un scan peut avoir un avis
db.Scan.hasOne(db.Avis, {
    foreignKey: 'scanId',
    as: 'avis',
    onDelete: 'RESTRICT'
});
db.Avis.belongsTo(db.Scan, {
    foreignKey: 'scanId',
    as: 'scan'
});

// ==========================================
// MÉTHODES UTILITAIRES
// ==========================================

/**
 * Teste la connexion à la base de données
 */
db.testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connexion à la base de données réussie');
        return true;
    } catch (error) {
        console.error('❌ Impossible de se connecter à la base de données:', error);
        return false;
    }
};

/**
 * Synchronise tous les modèles avec la base de données
 */
db.syncDatabase = async (force = false, alter = false) => {
    try {
        await sequelize.sync({ force, alter });
        console.log('✅ Base de données synchronisée');
        
        if (force) {
            await db.createDefaultRoles();
            await db.createDefaultCategories();
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation:', error);
        return false;
    }
};

/**
 * Crée les rôles par défaut
 */
db.createDefaultRoles = async () => {
    try {
        const roles = [
            {
                name: 'admin',
                label: 'Administrateur',
                description: 'Accès complet',
                permissions: [
                    'users.read', 'users.create', 'users.update', 'users.delete',
                    'prestataires.verify', 'categories.manage', 'system.configure',
                    'blacklist.manage'
                ]
            },
            {
                name: 'prestataire',
                label: 'Prestataire',
                description: 'Gestion du commerce',
                permissions: [
                    'profile.read', 'profile.update',
                    'promotions.manage', 'scans.read'
                ]
            },
            {
                name: 'client',
                label: 'Client',
                description: 'Utilisation des promotions',
                permissions: [
                    'prestataires.read', 'prestataires.search',
                    'avis.create', 'scans.view'
                ]
            }
        ];

        for (const roleData of roles) {
            await db.Role.findOrCreate({
                where: { name: roleData.name },
                defaults: roleData
            });
        }
        
        console.log('✅ Rôles par défaut créés');
    } catch (error) {
        console.error('❌ Erreur lors de la création des rôles:', error);
    }
};

/**
 * Crée des catégories par défaut
 */
db.createDefaultCategories = async () => {
    try {
        const categories = [
            {
                nom: 'Mode & Vêtements',
                slug: 'mode-vetements',
                description: 'Boutiques de mode, vêtements, accessoires',
                icon: '👔',
                couleur: '#f093fb'
            },
            {
                nom: 'Restaurants',
                slug: 'restaurants',
                description: 'Restaurants, cafés, brasseries',
                icon: '🍽️',
                couleur: '#4facfe'
            },
            {
                nom: 'Hôtels',
                slug: 'hotels',
                description: 'Hôtels, hébergements, gîtes',
                icon: '🏨',
                couleur: '#43e97b'
            },
            {
                nom: 'Beauté & Spa',
                slug: 'beaute-spa',
                description: 'Salons de beauté, coiffure, spa',
                icon: '💄',
                couleur: '#fa709a'
            },
            {
                nom: 'Agences de Voyage',
                slug: 'agences-voyage',
                description: 'Agences de voyage, tour opérateurs',
                icon: '✈️',
                couleur: '#667eea'
            },
            {
                nom: 'Sport & Fitness',
                slug: 'sport-fitness',
                description: 'Salles de sport, fitness',
                icon: '⚽',
                couleur: '#30cfd0'
            },
            {
                nom: 'High-Tech',
                slug: 'high-tech',
                description: 'Électronique, informatique',
                icon: '📱',
                couleur: '#a8edea'
            }
        ];

        for (const catData of categories) {
            await db.Category.findOrCreate({
                where: { slug: catData.slug },
                defaults: catData
            });
        }
        
        console.log('✅ Catégories par défaut créées');
    } catch (error) {
        console.error('❌ Erreur lors de la création des catégories:', error);
    }
};

module.exports = db;