const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

/**
 * Modèle User - Gestion des utilisateurs
 * Sert de base pour tous les types d'utilisateurs (admin, prestataire, client)
 */
module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Email invalide'
        }
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [8, 255],
          msg: 'Le mot de passe doit contenir au moins 8 caractères'
        }
      }
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Compte activé ou désactivé'
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Email vérifié'
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Nombre de tentatives de connexion échouées'
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de verrouillage du compte'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // === OAUTH (Google & Apple) ===
    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'ID Google pour OAuth'
    },
    appleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'ID Apple pour OAuth'
    },
    oauthProvider: {
      type: DataTypes.ENUM('local', 'google', 'apple'),
      defaultValue: 'local',
      comment: 'Méthode de connexion utilisée'
    },
    
    // === BLACKLIST ===
    estBlackliste: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Utilisateur bloqué par admin'
    },
    raisonBlacklist: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raison du blocage'
    },
    dateBlacklist: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date du blocage'
    },
    
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Préférences utilisateur (langue, notifications, etc.)'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['roleId']
      },
      {
        fields: ['isActive', 'isEmailVerified']
      }
    ],
    hooks: {
      // Hash du mot de passe avant création
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      // Hash du mot de passe avant mise à jour si modifié
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Méthode pour comparer les mots de passe
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // Méthode pour incrémenter les tentatives de connexion
  User.prototype.incLoginAttempts = async function() {
    // Si le compte était verrouillé et que le délai est dépassé
    if (this.lockUntil && this.lockUntil < new Date()) {
      return await this.update({
        loginAttempts: 1,
        lockUntil: null
      });
    }

    const updates = { loginAttempts: this.loginAttempts + 1 };
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 heures

    // Verrouille le compte après 5 tentatives
    if (this.loginAttempts + 1 >= maxAttempts && !this.lockUntil) {
      updates.lockUntil = new Date(Date.now() + lockTime);
    }

    return await this.update(updates);
  };

  // Méthode pour réinitialiser les tentatives de connexion
  User.prototype.resetLoginAttempts = async function() {
    return await this.update({
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date()
    });
  };

  // Méthode pour vérifier si le compte est verrouillé
  User.prototype.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > new Date());
  };

  // Méthode pour vérifier si le compte est blacklisté
  User.prototype.isBlacklisted = function() {
    return this.estBlackliste === true;
  };

  // Méthode pour blacklister un utilisateur
  User.prototype.blacklister = async function(raison) {
    this.estBlackliste = true;
    this.raisonBlacklist = raison;
    this.dateBlacklist = new Date();
    this.isActive = false;
    return await this.save();
  };

  // Méthode pour retirer de la blacklist
  User.prototype.deblacklister = async function() {
    this.estBlackliste = false;
    this.raisonBlacklist = null;
    this.dateBlacklist = null;
    this.isActive = true;
    return await this.save();
  };

  // Exclure les données sensibles des réponses JSON
  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    delete values.emailVerificationToken;
    delete values.refreshToken;
    return values;
  };

  return User;
};
