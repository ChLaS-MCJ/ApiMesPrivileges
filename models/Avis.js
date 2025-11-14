const { DataTypes } = require('sequelize');

/**
 * Modèle Avis - Système d'évaluation simple par étoiles
 * Un avis ne peut être laissé qu'après avoir scanné un QR code
 * 1 seul avis par client et par commerce (non modifiable)
 */
module.exports = (sequelize) => {
  const Avis = sequelize.define('Avis', {
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Client qui a laissé l\'avis'
    },
    
    // === NOTE ===
    note: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: 1,
          msg: 'La note minimum est 1'
        },
        max: {
          args: 5,
          msg: 'La note maximum est 5'
        },
        isInt: {
          msg: 'La note doit être un nombre entier'
        }
      },
      comment: 'Note de 1 à 5 étoiles'
    },
    
    // === LIEN AVEC LE SCAN ===
    scanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'scans',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Le scan qui a permis de laisser cet avis'
    }
    
  }, {
    tableName: 'avis',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['prestataireId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['note']
      },
      {
        unique: true,
        fields: ['prestataireId', 'userId'],
        name: 'unique_avis_per_user_per_prestataire'
      },
      {
        unique: true,
        fields: ['scanId']
      }
    ]
  });

  return Avis;
};

