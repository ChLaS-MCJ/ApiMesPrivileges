const db = require('../db.config');
const { Op } = require('sequelize');

const { Prestataire, Category, Promotion, Scan, Avis, User } = db;

// ==========================================
// ROUTES PUBLIQUES
// ==========================================

/**
 * GET /api/prestataires
 * Liste tous les commerces avec filtres
 */
exports.getAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      ville, 
      categoryId, 
      typeCommerce,
      noteMin,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { 
      estActif: true,
      estBlackliste: false
    };

    if (ville) where.ville = ville;
    if (categoryId) where.categoryId = categoryId;
    if (typeCommerce) where.typeCommerce = typeCommerce;
    if (noteMin) where.noteGlobale = { [Op.gte]: noteMin };
    if (search) {
      where[Op.or] = [
        { nomCommerce: { [Op.like]: `%${search}%` } },
        { descriptionCourte: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Prestataire.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['noteGlobale', 'DESC'], ['nombreAvis', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        prestataires: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur getAll:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

/**
 * GET /api/prestataires/:id
 * Détails d'un commerce
 */
exports.getById = async (req, res) => {
  try {
    const prestataire = await Prestataire.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category' },
        { 
          model: Promotion, 
          as: 'promotions',
          where: { 
            estActive: true,
            dateDebut: { [Op.lte]: new Date() },
            dateFin: { [Op.gte]: new Date() }
          },
          required: false
        }
      ]
    });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    if (prestataire.estBlackliste) {
      return res.status(403).json({ 
        success: false,
        message: 'Ce commerce n\'est plus accessible' 
      });
    }

    // Incrémenter les visites
    await prestataire.incrementerVisites();

    res.json({
      success: true,
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur getById:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

/**
 * GET /api/prestataires/ville/:ville
 * Commerces par ville
 */
exports.getByVille = async (req, res) => {
  try {
    const { ville } = req.params;
    const { categoryId } = req.query;

    const where = { 
      ville,
      estActif: true,
      estBlackliste: false
    };

    if (categoryId) where.categoryId = categoryId;

    const prestataires = await Prestataire.findAll({
      where,
      include: [
        { model: Category, as: 'category' }
      ],
      order: [['noteGlobale', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        ville,
        total: prestataires.length,
        prestataires
      }
    });

  } catch (error) {
    console.error('Erreur getByVille:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

/**
 * GET /api/prestataires/search/nearby
 * Recherche par proximité GPS
 */
exports.searchNearby = async (req, res) => {
  try {
    const { latitude, longitude, rayon = 10, categoryId } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false,
        message: 'Latitude et longitude requises' 
      });
    }

    const where = { 
      estActif: true,
      estBlackliste: false
    };

    if (categoryId) where.categoryId = categoryId;

    const prestataires = await Prestataire.findAll({
      where,
      include: [
        { model: Category, as: 'category' }
      ]
    });

    // Filtrer par distance
    const prestataireProches = prestataires
      .map(p => {
        const distance = p.calculerDistance(parseFloat(longitude), parseFloat(latitude));
        return { prestataire: p, distance };
      })
      .filter(item => item.distance <= parseFloat(rayon))
      .sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      data: {
        position: { latitude, longitude },
        rayon: parseFloat(rayon),
        total: prestataireProches.length,
        prestataires: prestataireProches
      }
    });

  } catch (error) {
    console.error('Erreur searchNearby:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la recherche',
      error: error.message 
    });
  }
};

/**
 * GET /api/prestataires/:id/promotions
 * Promotions actives d'un commerce
 */
exports.getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      where: {
        prestataireId: req.params.id,
        estActive: true,
        dateDebut: { [Op.lte]: new Date() },
        dateFin: { [Op.gte]: new Date() }
      },
      order: [['dateDebut', 'DESC']]
    });

    res.json({
      success: true,
      data: promotions
    });

  } catch (error) {
    console.error('Erreur getPromotions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

// ==========================================
// ROUTES PRESTATAIRE
// ==========================================

/**
 * POST /api/prestataires
 * Créer son commerce
 */
exports.create = async (req, res) => {
  try {
    // Vérifier si le prestataire existe déjà
    const existing = await Prestataire.findOne({ where: { userId: req.user.id } });
    if (existing) {
      return res.status(400).json({ 
        success: false,
        message: 'Vous avez déjà un commerce' 
      });
    }

    const prestataire = await Prestataire.create({
      ...req.body,
      userId: req.user.id
    });

    await prestataire.reload({ include: [{ model: Category, as: 'category' }] });

    res.status(201).json({
      success: true,
      message: 'Commerce créé avec succès',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur create:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la création',
      error: error.message 
    });
  }
};

/**
 * GET /api/prestataires/me/info
 * Mon commerce
 */
exports.getMe = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({
      where: { userId: req.user.id },
      include: [
        { model: Category, as: 'category' },
        { model: Promotion, as: 'promotions' }
      ]
    });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    res.json({
      success: true,
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur getMe:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

/**
 * PUT /api/prestataires/me
 * Modifier son commerce
 */
exports.updateMe = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    const { 
      nomCommerce, 
      typeCommerce, 
      categoryId, 
      descriptionCourte,
      imagePrincipale,
      adresse,
      codePostal,
      ville,
      latitude,
      longitude,
      horaires
    } = req.body;

    if (nomCommerce) prestataire.nomCommerce = nomCommerce;
    if (typeCommerce) prestataire.typeCommerce = typeCommerce;
    if (categoryId) prestataire.categoryId = categoryId;
    if (descriptionCourte) prestataire.descriptionCourte = descriptionCourte;
    if (imagePrincipale) prestataire.imagePrincipale = imagePrincipale;
    if (adresse) prestataire.adresse = adresse;
    if (codePostal) prestataire.codePostal = codePostal;
    if (ville) prestataire.ville = ville;
    if (latitude) prestataire.latitude = latitude;
    if (longitude) prestataire.longitude = longitude;
    if (horaires) prestataire.horaires = horaires;

    await prestataire.save();

    res.json({
      success: true,
      message: 'Commerce mis à jour',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur updateMe:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message 
    });
  }
};

/**
 * POST /api/prestataires/me/images
 * Ajouter une image
 */
exports.addImage = async (req, res) => {
  try {
    const { url } = req.body;
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    await prestataire.ajouterImage(url);

    res.json({
      success: true,
      message: 'Image ajoutée',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur addImage:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Erreur lors de l\'ajout',
      error: error.message 
    });
  }
};

/**
 * DELETE /api/prestataires/me/images/:index
 * Supprimer une image
 */
exports.deleteImage = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    await prestataire.supprimerImage(parseInt(req.params.index));

    res.json({
      success: true,
      message: 'Image supprimée',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur deleteImage:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Erreur lors de la suppression',
      error: error.message 
    });
  }
};

/**
 * PUT /api/prestataires/me/horaires
 * Modifier horaires
 */
exports.updateHoraires = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    prestataire.horaires = req.body.horaires;
    await prestataire.save();

    res.json({
      success: true,
      message: 'Horaires mis à jour',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur updateHoraires:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message 
    });
  }
};

/**
 * GET /api/prestataires/me/stats
 * Statistiques du commerce
 */
exports.getStats = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    const stats = {
      nombreScansTotal: prestataire.nombreScansTotal,
      nombreClientsUniques: prestataire.nombreClientsUniques,
      nombreVisitesFiche: prestataire.nombreVisitesFiche,
      noteGlobale: prestataire.noteGlobale,
      nombreAvis: prestataire.nombreAvis
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

/**
 * GET /api/prestataires/me/scans
 * Historique des scans
 */
exports.getScans = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    const { count, rows } = await Scan.findAndCountAll({
      where: { prestataireId: prestataire.id },
      include: [
        { 
          model: User, 
          as: 'client',
          include: [{ model: db.Client, as: 'client' }]
        },
        { model: Promotion, as: 'promotion' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['dateScan', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        scans: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur getScans:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message 
    });
  }
};

// ==========================================
// ROUTES ADMIN
// ==========================================

/**
 * PUT /api/prestataires/:id
 * Modifier un commerce (admin)
 */
exports.update = async (req, res) => {
  try {
    const prestataire = await Prestataire.findByPk(req.params.id);

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    await prestataire.update(req.body);

    res.json({
      success: true,
      message: 'Commerce mis à jour',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur update:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message 
    });
  }
};

/**
 * DELETE /api/prestataires/:id
 * Supprimer un commerce (admin)
 */
exports.delete = async (req, res) => {
  try {
    const prestataire = await Prestataire.findByPk(req.params.id);

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    await prestataire.destroy();

    res.json({
      success: true,
      message: 'Commerce supprimé'
    });

  } catch (error) {
    console.error('Erreur delete:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message 
    });
  }
};

/**
 * POST /api/prestataires/:id/verify
 * Vérifier un commerce (admin)
 */
exports.verify = async (req, res) => {
  try {
    const prestataire = await Prestataire.findByPk(req.params.id);

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    prestataire.estVerifie = true;
    await prestataire.save();

    res.json({
      success: true,
      message: 'Commerce vérifié',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur verify:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la vérification',
      error: error.message 
    });
  }
};

/**
 * POST /api/prestataires/:id/blacklist
 * Blacklister un commerce (admin)
 */
exports.blacklist = async (req, res) => {
  try {
    const { raison } = req.body;
    const prestataire = await Prestataire.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    await prestataire.blacklister(raison);
    await prestataire.user.blacklister(raison);

    res.json({
      success: true,
      message: 'Commerce blacklisté',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur blacklist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du blacklistage',
      error: error.message 
    });
  }
};

/**
 * DELETE /api/prestataires/:id/blacklist
 * Déblocquer un commerce (admin)
 */
exports.unblacklist = async (req, res) => {
  try {
    const prestataire = await Prestataire.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!prestataire) {
      return res.status(404).json({ 
        success: false,
        message: 'Commerce non trouvé' 
      });
    }

    await prestataire.deblacklister();
    await prestataire.user.deblacklister();

    res.json({
      success: true,
      message: 'Commerce déblocké',
      data: prestataire
    });

  } catch (error) {
    console.error('Erreur unblacklist:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du déblocage',
      error: error.message 
    });
  }
};
