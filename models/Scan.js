const { DataTypes } = require('sequelize');

/**
 * Modèle Scan - Historique des scans QR code
 * Enregistre chaque scan : qui, où, quelle promo, quand
 */
module.exports = (sequelize) => {
  const Scan = sequelize.define('Scan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // === QUI ===
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Client dont le QR a été scanné'
    },
    
    // === OÙ ===
    prestataireId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'prestataires',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Commerce qui a scanné'
    },
    
    // === QUELLE PROMO ===
    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'promotions',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Promotion utilisée lors de ce scan'
    },
    
    // === QUAND ===
    dateScan: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date et heure du scan'
    },
    
    // === STATUT ===
    aEteNote: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Le client a-t-il laissé un avis après ce scan ?'
    }
    
  }, {
    tableName: 'scans',
    timestamps: true,
    paranoid: false, // Pas de soft delete pour les scans
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['prestataireId']
      },
      {
        fields: ['promotionId']
      },
      {
        fields: ['dateScan']
      },
      {
        unique: true,
        fields: ['userId', 'promotionId'],
        name: 'unique_scan_per_user_per_promotion',
        comment: '1 seul scan par client et par promotion'
      },
      {
        fields: ['prestataireId', 'dateScan']
      },
      {
        fields: ['userId', 'prestataireId']
      }
    ]
  });

  return Scan;
};
