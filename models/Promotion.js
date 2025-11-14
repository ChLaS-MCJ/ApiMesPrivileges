const { DataTypes } = require('sequelize');

/**
 * Modèle Promotion - Gestion des promotions par commerce
 * Chaque promotion peut être utilisée 1 fois par client
 */
module.exports = (sequelize) => {
  const Promotion = sequelize.define('Promotion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    prestataireId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'prestataires',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    
    // === INFORMATIONS DE LA PROMOTION ===
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le titre est requis'
        },
        len: {
          args: [3, 255],
          msg: 'Le titre doit contenir entre 3 et 255 caractères'
        }
      },
      comment: 'Titre de la promotion (ex: "10% de réduction")'
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: 'La description ne peut pas dépasser 1000 caractères'
        }
      },
      comment: 'Description détaillée de la promotion'
    },
    
    // === VALIDITÉ ===
    dateDebut: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'Date de début invalide'
        }
      },
      comment: 'Date de début de la promotion'
    },
    
    dateFin: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'Date de fin invalide'
        },
        isAfterDebut(value) {
          if (value <= this.dateDebut) {
            throw new Error('La date de fin doit être après la date de début');
          }
        }
      },
      comment: 'Date de fin de la promotion'
    },
    
    // === STATUT ===
    estActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Promotion active/inactive (peut être désactivée manuellement)'
    },
    
    // === STATISTIQUES ===
    nombreUtilisations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre total d\'utilisations de cette promotion'
    },
    
    nombreClientsUniques: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre de clients uniques ayant utilisé cette promotion'
    }
    
  }, {
    tableName: 'promotions',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['prestataireId']
      },
      {
        fields: ['estActive']
      },
      {
        fields: ['dateDebut', 'dateFin']
      },
      {
        fields: ['dateDebut']
      },
      {
        fields: ['dateFin']
      }
    ]
  });

  // === MÉTHODES ===

  /**
   * Vérifie si la promotion est actuellement valide
   */
  Promotion.prototype.estValide = function() {
    const maintenant = new Date();
    return this.estActive && 
           this.dateDebut <= maintenant && 
           this.dateFin >= maintenant;
  };

  /**
   * Incrémente le compteur d'utilisations
   */
  Promotion.prototype.incrementerUtilisations = async function(nouveauClient = false) {
    this.nombreUtilisations += 1;
    if (nouveauClient) {
      this.nombreClientsUniques += 1;
    }
    return await this.save();
  };

  /**
   * Retourne le nombre de jours restants
   */
  Promotion.prototype.joursRestants = function() {
    const maintenant = new Date();
    const diff = this.dateFin - maintenant;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return Promotion;
};
