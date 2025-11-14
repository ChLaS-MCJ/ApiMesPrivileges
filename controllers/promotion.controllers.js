const db = require('../db.config');
const { Op } = require('sequelize');
const { Promotion, Prestataire } = db;

/**
 * GET /api/promotions
 */
exports.getAll = async (req, res) => {
  try {
    const { ville, categoryId } = req.query;
    const where = {
      estActive: true,
      dateDebut: { [Op.lte]: new Date() },
      dateFin: { [Op.gte]: new Date() }
    };

    const include = [{
      model: Prestataire,
      as: 'prestataire',
      where: { estActif: true, estBlackliste: false }
    }];

    if (ville) include[0].where.ville = ville;
    if (categoryId) include[0].where.categoryId = categoryId;

    const promotions = await Promotion.findAll({
      where,
      include,
      order: [['dateDebut', 'DESC']]
    });

    res.json({ success: true, data: promotions });
  } catch (error) {
    console.error('Erreur getAll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/promotions/:id
 */
exports.getById = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id, {
      include: [{ model: Prestataire, as: 'prestataire' }]
    });

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion non trouvée' });
    }

    res.json({ success: true, data: promotion });
  } catch (error) {
    console.error('Erreur getById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/promotions
 */
exports.create = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });
    
    if (!prestataire) {
      return res.status(404).json({ success: false, message: 'Commerce non trouvé' });
    }

    const promotion = await Promotion.create({
      ...req.body,
      prestataireId: prestataire.id
    });

    res.status(201).json({ success: true, message: 'Promotion créée', data: promotion });
  } catch (error) {
    console.error('Erreur create:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/promotions/:id
 */
exports.update = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });
    const promotion = await Promotion.findOne({
      where: { id: req.params.id, prestataireId: prestataire.id }
    });

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion non trouvée' });
    }

    await promotion.update(req.body);
    res.json({ success: true, message: 'Promotion mise à jour', data: promotion });
  } catch (error) {
    console.error('Erreur update:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/promotions/:id
 */
exports.delete = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });
    const promotion = await Promotion.findOne({
      where: { id: req.params.id, prestataireId: prestataire.id }
    });

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion non trouvée' });
    }

    await promotion.destroy();
    res.json({ success: true, message: 'Promotion supprimée' });
  } catch (error) {
    console.error('Erreur delete:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/promotions/me/list
 */
exports.getMine = async (req, res) => {
  try {
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });
    
    if (!prestataire) {
      return res.status(404).json({ success: false, message: 'Commerce non trouvé' });
    }

    const promotions = await Promotion.findAll({
      where: { prestataireId: prestataire.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: promotions });
  } catch (error) {
    console.error('Erreur getMine:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/promotions/admin/:id
 */
exports.adminDelete = async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion non trouvée' });
    }

    await promotion.destroy();
    res.json({ success: true, message: 'Promotion supprimée' });
  } catch (error) {
    console.error('Erreur adminDelete:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
