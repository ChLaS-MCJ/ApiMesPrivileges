const db = require('../db.config');
const { Category } = db;

/**
 * GET /api/categories
 */
exports.getAll = async (req, res) => {
  try {
    const { parentId } = req.query;
    const where = { isActive: true };
    
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    const categories = await Category.findAll({
      where,
      include: [
        { 
          model: Category, 
          as: 'sousCategories',
          where: { isActive: true },
          required: false
        }
      ],
      order: [['ordre', 'ASC'], ['nom', 'ASC']]
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Erreur getAll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/categories/:id
 */
exports.getById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'sousCategories' },
        { model: Category, as: 'parent' }
      ]
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Erreur getById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/categories/slug/:slug
 */
exports.getBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { slug: req.params.slug },
      include: [
        { model: Category, as: 'sousCategories' },
        { model: Category, as: 'parent' }
      ]
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Erreur getBySlug:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/categories (ADMIN)
 */
exports.create = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, message: 'Catégorie créée', data: category });
  } catch (error) {
    console.error('Erreur create:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/categories/:id (ADMIN)
 */
exports.update = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    await category.update(req.body);
    res.json({ success: true, message: 'Catégorie mise à jour', data: category });
  } catch (error) {
    console.error('Erreur update:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/categories/:id (ADMIN)
 */
exports.delete = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    // Vérifier s'il y a des prestataires
    if (category.nombrePrestataires > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Impossible de supprimer une catégorie avec des prestataires' 
      });
    }

    await category.destroy();
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('Erreur delete:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
