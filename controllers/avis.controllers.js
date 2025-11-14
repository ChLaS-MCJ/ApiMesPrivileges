const db = require('../db.config');
const { Avis, Scan, Prestataire, Client, User } = db;

/**
 * POST /api/avis
 * Laisser un avis (CLIENT - après scan uniquement)
 */
exports.create = async (req, res) => {
  try {
    const { scanId, note } = req.body;

    // Validation
    if (!note || note < 1 || note > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Note invalide (1-5)' 
      });
    }

    // 1. Vérifier le scan
    const scan = await Scan.findOne({
      where: { id: scanId, userId: req.user.id },
      include: [{ model: Prestataire, as: 'prestataire' }]
    });

    if (!scan) {
      return res.status(404).json({ 
        success: false, 
        message: 'Scan non trouvé ou non autorisé' 
      });
    }

    // 2. Vérifier si déjà noté
    if (scan.aEteNote) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vous avez déjà noté ce scan' 
      });
    }

    // 3. Vérifier si déjà un avis pour ce commerce
    const avisExistant = await Avis.findOne({
      where: {
        userId: req.user.id,
        prestataireId: scan.prestataireId
      }
    });

    if (avisExistant) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vous avez déjà laissé un avis pour ce commerce' 
      });
    }

    // 4. Créer l'avis
    const avis = await Avis.create({
      prestataireId: scan.prestataireId,
      userId: req.user.id,
      scanId: scanId,
      note: parseInt(note)
    });

    // 5. Marquer le scan comme noté
    scan.aEteNote = true;
    await scan.save();

    // 6. Mettre à jour la note du prestataire
    await scan.prestataire.ajouterAvis(parseInt(note));

    // 7. Mettre à jour les stats du client
    const client = await Client.findOne({ where: { userId: req.user.id } });
    await client.incrementerAvis();

    res.status(201).json({
      success: true,
      message: 'Avis enregistré',
      data: {
        avis,
        noteGlobale: scan.prestataire.noteGlobale,
        nombreAvis: scan.prestataire.nombreAvis
      }
    });

  } catch (error) {
    console.error('Erreur create:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * GET /api/avis/prestataire/:prestataireId
 * Avis d'un prestataire (PUBLIC)
 */
exports.getByPrestataire = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Avis.findAndCountAll({
      where: { prestataireId: req.params.prestataireId },
      include: [
        { 
          model: User, 
          as: 'client',
          attributes: ['id'],
          include: [{ 
            model: Client, 
            as: 'client',
            attributes: ['prenom', 'nom']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        avis: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur getByPrestataire:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * GET /api/avis/me
 * Mes avis (CLIENT)
 */
exports.getMine = async (req, res) => {
  try {
    const avis = await Avis.findAll({
      where: { userId: req.user.id },
      include: [
        { 
          model: Prestataire, 
          as: 'prestataire',
          attributes: ['id', 'nomCommerce', 'ville']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: avis });

  } catch (error) {
    console.error('Erreur getMine:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * DELETE /api/avis/:id
 * Supprimer un avis (ADMIN)
 */
exports.delete = async (req, res) => {
  try {
    const avis = await Avis.findByPk(req.params.id);

    if (!avis) {
      return res.status(404).json({ 
        success: false, 
        message: 'Avis non trouvé' 
      });
    }

    // Mettre à jour les stats du prestataire
    const prestataire = await Prestataire.findByPk(avis.prestataireId);
    if (prestataire && prestataire.nombreAvis > 0) {
      const totalNotes = prestataire.noteGlobale * prestataire.nombreAvis;
      const newNombreAvis = prestataire.nombreAvis - 1;
      
      if (newNombreAvis > 0) {
        prestataire.noteGlobale = (totalNotes - avis.note) / newNombreAvis;
        prestataire.noteGlobale = Math.round(prestataire.noteGlobale * 100) / 100;
      } else {
        prestataire.noteGlobale = 0;
      }
      
      prestataire.nombreAvis = newNombreAvis;
      await prestataire.save();
    }

    await avis.destroy();

    res.json({ success: true, message: 'Avis supprimé' });

  } catch (error) {
    console.error('Erreur delete:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
