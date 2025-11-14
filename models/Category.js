const { DataTypes } = require('sequelize');

/**
 * Modèle Category - Gestion des catégories de prestataires
 * Ex: Mode & Vêtements, Restaurants, Hôtels, Beauté, Sport, etc.
 */
module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Nom de la catégorie'
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Slug URL-friendly',
      set(value) {
        this.setDataValue('slug', value.toLowerCase().replace(/\s+/g, '-'));
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description de la catégorie'
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Icône de la catégorie (emoji ou nom d\'icône)'
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Image/photo de la catégorie'
    },
    couleur: {
      type: DataTypes.STRING(7),
      defaultValue: '#667eea',
      comment: 'Couleur hexadécimale de la catégorie',
      validate: {
        is: {
          args: /^#[0-9A-F]{6}$/i,
          msg: 'La couleur doit être au format hexadécimal (#RRGGBB)'
        }
      }
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'ID de la catégorie parente (pour sous-catégories)'
    },
    ordre: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordre d\'affichage'
    },
    nombrePrestataires: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre de prestataires dans cette catégorie'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Catégorie active/inactive'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Métadonnées supplémentaires (SEO, etc.)'
    }
  }, {
    tableName: 'categories',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['nom']
      },
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['parentId']
      },
      {
        fields: ['isActive', 'ordre']
      }
    ]
  });

  // Méthode pour obtenir le chemin complet (pour breadcrumb)
  Category.prototype.getCheminComplet = async function() {
    const chemin = [this.nom];
    let parent = this;
    
    while (parent.parentId) {
      parent = await Category.findByPk(parent.parentId);
      if (parent) {
        chemin.unshift(parent.nom);
      }
    }
    
    return chemin;
  };

  // Méthode pour incrémenter le compteur de prestataires
  Category.prototype.incrementerPrestataires = async function() {
    this.nombrePrestataires += 1;
    return await this.save();
  };

  // Méthode pour décrémenter le compteur de prestataires
  Category.prototype.decrementerPrestataires = async function() {
    if (this.nombrePrestataires > 0) {
      this.nombrePrestataires -= 1;
      return await this.save();
    }
    return this;
  };

  return Category;
};
