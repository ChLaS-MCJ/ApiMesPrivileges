const { DataTypes } = require('sequelize');

/**
 * Modèle Role - Gestion des rôles utilisateurs
 * Rôles disponibles: admin, prestataire, client
 */
module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.ENUM('admin', 'prestataire', 'client'),
      allowNull: false,
      unique: true,
      comment: 'Nom du rôle: admin, prestataire ou client'
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Label lisible du rôle (ex: "Administrateur")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description détaillée du rôle et de ses permissions'
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Liste des permissions associées au rôle'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Indique si le rôle est actif'
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  // Méthode pour vérifier une permission
  Role.prototype.hasPermission = function(permission) {
    return this.permissions && this.permissions.includes(permission);
  };

  // Méthode pour ajouter une permission
  Role.prototype.addPermission = async function(permission) {
    if (!this.permissions) {
      this.permissions = [];
    }
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
      return await this.save();
    }
    return this;
  };

  return Role;
};
