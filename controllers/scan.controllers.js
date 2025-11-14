const db = require('../db.config');
const { Op } = require('sequelize');
const { Scan, Promotion, Prestataire, Client, User } = db;

/**
 * POST /api/scans/scan
 * Scanner le QR code d'un client (PRESTATAIRE)
 */
exports.scanQrCode = async (req, res) => {
  try {
    const { qrCode, promotionId } = req.body;

    // 1. Trouver le client via son QR code
    const client = await Client.findOne({ 
      where: { qrCode },
      include: [{ model: User, as: 'user' }]
    });

    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'QR Code invalide' 
      });
    }

    // 2. Vérifier si le client est blacklisté
    if (client.user.isBlacklisted()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Ce client est bloqué' 
      });
    }

    // 3. Trouver le prestataire
    const prestataire = await Prestataire.findOne({ where: { userId: req.user.id } });
    
    if (!prestataire) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commerce non trouvé' 
      });
    }

    // 4. Vérifier la promotion
    const promotion = await Promotion.findOne({
      where: { 
        id: promotionId,
        prestataireId: prestataire.id
      }
    });

    if (!promotion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Promotion non trouvée' 
      });
    }

    if (!promotion.estValide()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Promotion expirée ou inactive' 
      });
    }

    // 5. Vérifier si déjà utilisée
    const scanExistant = await Scan.findOne({
      where: {
        userId: client.userId,
        promotionId: promotionId
      }
    });

    if (scanExistant) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cette promotion a déjà été utilisée par ce client' 
      });
    }

    // 6. Créer le scan
    const scan = await Scan.create({
      userId: client.userId,
      prestataireId: prestataire.id,
      promotionId: promotionId,
      dateScan: new Date()
    });

    // 7. Mettre à jour les stats
    const estNouveauClient = client.nombreScans === 0;
    await client.incrementerScans();
    await prestataire.incrementerScans(estNouveauClient);
    await promotion.incrementerUtilisations(estNouveauClient);

    res.status(201).json({
      success: true,
      message: 'Scan effectué avec succès',
      data: {
        scan,
        client: {
          prenom: client.prenom,
          nom: client.nom
        },
        promotion: {
          titre: promotion.titre
        }
      }
    });

  } catch (error) {
    console.error('Erreur scanQrCode:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * GET /api/scans/history
 * Historique des scans (PRESTATAIRE)
 */
exports.getHistory = async (req, res) => {
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
          include: [{ model: Client, as: 'client' }]
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
    console.error('Erreur getHistory:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * GET /api/scans/me
 * Historique des scans du client (CLIENT)
 */
exports.getMyScans = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Scan.findAndCountAll({
      where: { userId: req.user.id },
      include: [
        { 
          model: Prestataire, 
          as: 'prestataire',
          include: [{ model: db.Category, as: 'category' }]
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
    console.error('Erreur getMyScans:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * GET /api/scans/me/stats
 * Stats du client (CLIENT)
 */
exports.getMyStats = async (req, res) => {
  try {
    const client = await Client.findOne({ where: { userId: req.user.id } });

    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profil client non trouvé' 
      });
    }

    const stats = {
      nombreScans: client.nombreScans,
      nombreAvisLaisses: client.nombreAvisLaisses,
      commercesFavoris: client.commercesFavoris?.length || 0
    };

    res.json({ success: true, data: stats });

  } catch (error) {
    console.error('Erreur getMyStats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
