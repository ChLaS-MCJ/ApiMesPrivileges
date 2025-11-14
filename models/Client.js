// models/Client.js
const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    
    // QR CODE UNIQUE
    qrCode: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'QR code unique du client'
    },
    
    // INFORMATIONS PERSONNELLES
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    nom: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^(\+33|0)[1-9](\d{2}){4}$/,
          msg: 'Numéro de téléphone français invalide'
        }
      }
    },
    
    // STATISTIQUES
    nombreScans: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre total de scans effectués'
    },
    
    nombreAvisLaisses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre total d\'avis laissés'
    },
    
    // FAVORIS
    commercesFavoris: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'IDs des commerces favoris',
      validate: {
        isArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('commercesFavoris doit être un tableau');
          }
        }
      }
    },
    
    // DATES
    dateInscription: {
      type: DataTypes.DATE,
      allowNull: true
    }
    
  }, {
    tableName: 'clients',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['userId'],
        name: 'clients_user_id'
      },
      {
        unique: true,
        fields: ['qrCode'],
        name: 'clients_qr_code'
      }
    ]
  });

  // ==========================================
  // HOOKS
  // ==========================================

  /**
   * Avant création : générer QR code unique
   */
  Client.beforeCreate(async (client) => {
    // Générer QR code si pas fourni
    if (!client.qrCode) {
      client.qrCode = `QRC_${crypto.randomBytes(16).toString('hex')}`;
    }
    
    // Date d'inscription
    if (!client.dateInscription) {
      client.dateInscription = new Date();
    }
  });

  // ==========================================
  // MÉTHODES D'INSTANCE
  // ==========================================

  /**
   * Incrémente le nombre de scans
   */
  Client.prototype.incrementerScans = async function() {
    this.nombreScans += 1;
    return await this.save();
  };

  /**
   * Incrémente le nombre d'avis
   */
  Client.prototype.incrementerAvis = async function() {
    this.nombreAvisLaisses += 1;
    return await this.save();
  };

  /**
   * Ajouter un commerce aux favoris
   */
  Client.prototype.ajouterFavori = async function(prestataireId) {
    if (!this.commercesFavoris) {
      this.commercesFavoris = [];
    }
    
    if (!this.commercesFavoris.includes(prestataireId)) {
      this.commercesFavoris.push(prestataireId);
      return await this.save();
    }
    
    return this;
  };

  /**
   * Retirer un commerce des favoris
   */
  Client.prototype.retirerFavori = async function(prestataireId) {
    if (!this.commercesFavoris) {
      this.commercesFavoris = [];
      return this;
    }
    
    this.commercesFavoris = this.commercesFavoris.filter(id => id !== prestataireId);
    return await this.save();
  };

  /**
   * Vérifier si un commerce est en favori
   */
  Client.prototype.estFavori = function(prestataireId) {
    if (!this.commercesFavoris) return false;
    return this.commercesFavoris.includes(prestataireId);
  };

  /**
   * Obtenir le nom complet
   */
  Client.prototype.getNomComplet = function() {
    if (this.prenom && this.nom) {
      return `${this.prenom} ${this.nom}`;
    }
    return this.prenom || this.nom || 'Client';
  };

  // ==========================================
  // MÉTHODES STATIQUES
  // ==========================================

  /**
   * Trouver un client par son QR code
   */
  Client.findByQrCode = async function(qrCode) {
    return await this.findOne({
      where: { qrCode },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'email', 'isActive', 'estBlackliste']
        }
      ]
    });
  };

  /**
   * Générer un QR code unique
   */
  Client.generateQrCode = function() {
    return `QRC_${crypto.randomBytes(16).toString('hex')}`;
  };

  return Client;
};