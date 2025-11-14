const { DataTypes } = require('sequelize');

/**
 * Modèle Prestataire - Magasins, Restaurants, Hôtels
 * Commerce physique avec localisation fixe et système de promotions QR code
 */
module.exports = (sequelize) => {
  const Prestataire = sequelize.define('Prestataire', {
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
    
    // === INFORMATIONS DU COMMERCE ===
    nomCommerce: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le nom du commerce est requis'
        }
      },
      comment: 'Nom du magasin/restaurant/hôtel'
    },
    
    typeCommerce: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type de commerce (magasin, restaurant, hotel, agence-voyage, etc.)'
    },
    
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Catégorie du commerce'
    },
    
    descriptionCourte: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'La description courte ne peut pas dépasser 500 caractères'
        }
      },
      comment: 'Description courte visible dans la liste'
    },
    
    // === IMAGES ===
    imagePrincipale: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL de l\'image principale'
    },
    
    images: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Tableau des URLs des 5 images max',
      validate: {
        maxImages(value) {
          if (Array.isArray(value) && value.length > 5) {
            throw new Error('Maximum 5 images autorisées');
          }
        }
      }
    },
    
    // === STATISTIQUES VISITES ===
    nombreVisitesFiche: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre de fois que la fiche a été consultée'
    },
    
    // === LOCALISATION (FIXE) ===
    adresse: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'L\'adresse est requise'
        }
      }
    },
    
    codePostal: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le code postal est requis'
        },
        is: {
          args: /^\d{5}$/,
          msg: 'Code postal invalide (5 chiffres)'
        }
      }
    },
    
    ville: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La ville est requise'
        }
      }
    },
    
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        min: -90,
        max: 90
      },
      comment: 'Latitude GPS du commerce'
    },
    
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        min: -180,
        max: 180
      },
      comment: 'Longitude GPS du commerce'
    },
    
    // === HORAIRES ===
    horaires: {
      type: DataTypes.JSON,
      defaultValue: {
        lundi: { ouvert: true, debut: '09:00', fin: '19:00' },
        mardi: { ouvert: true, debut: '09:00', fin: '19:00' },
        mercredi: { ouvert: true, debut: '09:00', fin: '19:00' },
        jeudi: { ouvert: true, debut: '09:00', fin: '19:00' },
        vendredi: { ouvert: true, debut: '09:00', fin: '19:00' },
        samedi: { ouvert: true, debut: '09:00', fin: '18:00' },
        dimanche: { ouvert: false, debut: '10:00', fin: '13:00' }
      },
      comment: 'Horaires d\'ouverture par jour'
    },
    
    // === ÉVALUATIONS ===
    noteGlobale: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      },
      comment: 'Note moyenne sur 5'
    },
    
    nombreAvis: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre total d\'avis reçus'
    },
    
    // === STATISTIQUES SCANS ===
    nombreScansTotal: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre total de scans QR effectués'
    },
    
    nombreClientsUniques: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre de clients uniques ayant scanné'
    },
    
    // === STATUT ===
    estActif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Commerce actif/inactif'
    },
    
    estVerifie: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Commerce vérifié par admin'
    },
    
    estBlackliste: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Commerce bloqué par admin'
    },
    
    raisonBlacklist: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raison du blocage du commerce'
    },
    
    dateBlacklist: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date du blocage'
    },
    
    dateInscription: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
    
  }, {
    tableName: 'prestataires',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['userId']
      },
      {
        fields: ['ville']
      },
      {
        fields: ['codePostal']
      },
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['typeCommerce']
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['estActif']
      },
      {
        fields: ['noteGlobale']
      }
    ]
  });

  // === MÉTHODES ===

  /**
   * Calcule la distance avec des coordonnées GPS (formule de Haversine)
   */
  Prestataire.prototype.calculerDistance = function(longitude, latitude) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (latitude - this.latitude) * Math.PI / 180;
    const dLon = (longitude - this.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.latitude * Math.PI / 180) * 
              Math.cos(latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // 2 décimales
  };

  /**
   * Ajoute une image à la galerie
   */
  Prestataire.prototype.ajouterImage = async function(url) {
    const images = this.images || [];
    
    if (images.length >= 5) {
      throw new Error('Maximum 5 images autorisées');
    }
    
    images.push(url);
    this.images = images;
    return await this.save();
  };

  /**
   * Supprime une image de la galerie
   */
  Prestataire.prototype.supprimerImage = async function(index) {
    const images = this.images || [];
    
    if (index < 0 || index >= images.length) {
      throw new Error('Index invalide');
    }
    
    images.splice(index, 1);
    this.images = images;
    return await this.save();
  };

  /**
   * Met à jour la note après un nouvel avis
   */
  Prestataire.prototype.ajouterAvis = async function(note) {
    const totalNotes = this.noteGlobale * this.nombreAvis;
    this.nombreAvis += 1;
    this.noteGlobale = (totalNotes + note) / this.nombreAvis;
    this.noteGlobale = Math.round(this.noteGlobale * 100) / 100;
    return await this.save();
  };

  /**
   * Incrémente le compteur de scans
   */
  Prestataire.prototype.incrementerScans = async function(nouveauClient = false) {
    this.nombreScansTotal += 1;
    if (nouveauClient) {
      this.nombreClientsUniques += 1;
    }
    return await this.save();
  };

  /**
   * Incrémente le compteur de visites de la fiche
   */
  Prestataire.prototype.incrementerVisites = async function() {
    this.nombreVisitesFiche += 1;
    return await this.save();
  };

  /**
   * Blackliste le commerce
   */
  Prestataire.prototype.blacklister = async function(raison) {
    this.estBlackliste = true;
    this.raisonBlacklist = raison;
    this.dateBlacklist = new Date();
    this.estActif = false;
    return await this.save();
  };

  /**
   * Retire le commerce de la blacklist
   */
  Prestataire.prototype.deblacklister = async function() {
    this.estBlackliste = false;
    this.raisonBlacklist = null;
    this.dateBlacklist = null;
    this.estActif = true;
    return await this.save();
  };

  /**
   * Vérifie si le commerce est blacklisté
   */
  Prestataire.prototype.isBlacklisted = function() {
    return this.estBlackliste === true;
  };

  return Prestataire;
};
