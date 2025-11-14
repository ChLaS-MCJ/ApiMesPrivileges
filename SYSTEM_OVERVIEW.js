/**
 * ==============================================
 * SYSTÈME DE PROMOTION PAR QR CODE
 * ==============================================
 * 
 * CONCEPT:
 * Application mobile de géolocalisation de commerces
 * avec système de promotions via QR code unique par client
 */

// ==============================================
// FLUX UTILISATEUR CLIENT
// ==============================================

/*
1. LOGIN
   ↓
2. CARTE INTERACTIVE (France)
   - Dots groupés par zones
   - Zoom progressif sur les villes
   ↓
3. SÉLECTION VILLE
   - Click sur dot → Zoom sur ville
   - Click sur ville → Ouvre page catégories
   ↓
4. PAGE CATÉGORIES
   - Affiche toutes les catégories disponibles dans la ville
   - Avec icône + nom
   ↓
5. LISTE DES COMMERCES
   - Nom du commerce
   - Icône catégorie
   - Image principale
   - Promotion en cours (si existe)
   - Note globale
   ↓
6. DÉTAIL COMMERCE
   - Galerie photos (5 max)
   - Nom du commerce
   - Distance GPS (téléphone ↔ commerce)
   - Adresse complète
   - Description courte
   - Note globale ⭐
   - Bouton "Voir horaires"
   - Bouton "Voir mon QR code"
   - Promotion en cours/à venir
   ↓
7. AU MAGASIN
   - Client montre son QR code unique
   - Prestataire scanne
   - Promotion appliquée ✅
   ↓
8. APRÈS LE SCAN
   - Popup: "Notez ce commerce 1-5 ⭐"
   - 1 seul avis par commerce (non modifiable)
*/

// ==============================================
// FLUX UTILISATEUR PRESTATAIRE
// ==============================================

/*
1. LOGIN
   ↓
2. TABLEAU DE BORD
   - Stats: nombre scans, clients uniques, note globale
   - Historique des scans
   ↓
3. GESTION DU PROFIL
   - Modifier infos du commerce
   - Gérer les images (1 principale + 5 galerie)
   - Modifier horaires
   ↓
4. GESTION DES PROMOTIONS
   - Créer nouvelle promotion
   - Modifier promotion existante
   - Définir dates début/fin
   - Activer/désactiver
   ↓
5. SCANNER QR CODE CLIENT
   - Scanner le QR du client
   - Vérification: promo valide + pas déjà utilisée
   - Confirmation du scan
   - Enregistrement dans historique
*/

// ==============================================
// MODÈLES DE DONNÉES
// ==============================================

/*
1. USER (users)
   - Compte de base (email/password)
   - Role: admin, prestataire, client
   - Sécurité: tentatives connexion, verrouillage

2. ROLE (roles)
   - 3 rôles: admin, prestataire, client
   - Permissions par rôle

3. CLIENT (clients)
   - Profil client (nom, prénom, téléphone)
   - QR Code unique (généré auto)
   - Stats: nombre scans, nombre avis
   - Commerces favoris

4. PRESTATAIRE (prestataires)
   - Infos commerce (nom, type, catégorie)
   - Images (1 principale + 5 galerie max)
   - Localisation GPS fixe
   - Horaires par jour
   - Stats: note globale, nombre avis, scans

5. CATEGORY (categories)
   - Catégories de commerces
   - Structure hiérarchique (parent/enfant)
   - Icône + couleur
   - Compteur de commerces

6. PROMOTION (promotions)
   - Titre + description
   - Dates début/fin
   - Active/inactive
   - Stats: utilisations, clients uniques

7. SCAN (scans)
   - Historique des scans QR
   - Date/heure
   - Client + Commerce + Promotion
   - Flag "avis laissé"
   - CONTRAINTE: 1 scan par client par promotion

8. AVIS (avis)
   - Note de 1 à 5 étoiles
   - Lié à un scan
   - CONTRAINTE: 1 avis par client par commerce
   - Publication immédiate
   - Non modifiable
*/

// ==============================================
// RÈGLES MÉTIER IMPORTANTES
// ==============================================

/*
✅ QR CODE
   - 1 QR code unique par client (toujours le même)
   - Généré automatiquement à l'inscription
   - Le prestataire scanne le QR du client

✅ PROMOTIONS
   - Utilisable 1 fois par client
   - Peut être utilisée par plusieurs clients
   - Dates début/fin obligatoires
   - Peut être désactivée manuellement

✅ SCANS
   - Enregistre: qui, où, quelle promo, quand
   - 1 scan = 1 utilisation de promotion
   - Historique visible par client ET prestataire

✅ AVIS
   - Seulement après avoir scanné
   - 1 seul avis par client et par commerce
   - Note de 1 à 5 (entier)
   - Pas de commentaire
   - Publication immédiate
   - Non modifiable
   - Pas de réponse du prestataire

✅ GÉOLOCALISATION
   - Commerce = position GPS fixe
   - Distance calculée entre téléphone et commerce
   - Affichage en km avec 2 décimales
   - Carte interactive avec dots groupés

✅ IMAGES
   - 1 image principale
   - Maximum 5 images dans la galerie
   - Modifiable à tout moment par le prestataire
*/

// ==============================================
// STATISTIQUES AUTOMATIQUES
// ==============================================

/*
PRESTATAIRE:
   - nombreScansTotal: tous les scans effectués
   - nombreClientsUniques: clients différents
   - noteGlobale: moyenne des notes reçues
   - nombreAvis: nombre total d'avis

CLIENT:
   - nombreScans: scans effectués
   - nombreAvisLaisses: avis laissés
   - commercesFavoris: liste des favoris

PROMOTION:
   - nombreUtilisations: fois utilisée
   - nombreClientsUniques: clients différents

CATEGORY:
   - nombrePrestataires: commerces dans la catégorie
*/

// ==============================================
// RELATIONS ENTRE LES MODÈLES
// ==============================================

/*
User (1) ─────── (1) Client
User (1) ─────── (1) Prestataire
User (N) ─────── (1) Role

Prestataire (N) ─────── (1) Category
Prestataire (1) ─────── (N) Promotion
Prestataire (1) ─────── (N) Scan

Client (1) ─────── (N) Scan
Client (1) ─────── (N) Avis

Promotion (1) ─────── (N) Scan

Scan (1) ─────── (1) Avis

Category (N) ─────── (1) Category (parent)
*/

// ==============================================
// MÉTHODES UTILES
// ==============================================

/*
PRESTATAIRE:
   - calculerDistance(lng, lat): distance en km
   - ajouterImage(url): ajoute une image
   - supprimerImage(index): retire une image
   - ajouterAvis(note): met à jour la note globale
   - incrementerScans(nouveauClient): +1 scan

CLIENT:
   - regenererQrCode(): génère nouveau QR
   - ajouterFavori(prestataireId): ajoute favori
   - retirerFavori(prestataireId): retire favori
   - incrementerScans(): +1 scan
   - incrementerAvis(): +1 avis

PROMOTION:
   - estValide(): vérifie dates + actif
   - incrementerUtilisations(nouveauClient): +1
   - joursRestants(): nombre de jours avant fin

CATEGORY:
   - getCheminComplet(): breadcrumb complet
   - incrementerPrestataires(): +1 commerce
   - decrementerPrestataires(): -1 commerce
*/

// ==============================================
// EXEMPLE DE WORKFLOW COMPLET
// ==============================================

/*
// 1. Créer un prestataire
const prestataire = await Prestataire.create({
  nomCommerce: 'Boutique Mode Paris',
  typeCommerce: 'magasin',
  categoryId: 1,
  imagePrincipale: '/img.jpg',
  adresse: '15 Rue X',
  codePostal: '75001',
  ville: 'Paris',
  latitude: 48.8566,
  longitude: 2.3522
});

// 2. Créer une promotion
const promotion = await Promotion.create({
  prestataireId: prestataire.id,
  titre: '10% de réduction',
  dateDebut: new Date(),
  dateFin: new Date(+30 jours)
});

// 3. Créer un client (QR généré auto)
const client = await Client.create({
  userId: userId,
  prenom: 'Marie',
  nom: 'Dupont'
});
// client.qrCode est automatiquement généré

// 4. Scanner le QR code
const scan = await Scan.create({
  userId: client.userId,
  prestataireId: prestataire.id,
  promotionId: promotion.id
});

// 5. Laisser un avis
const avis = await Avis.create({
  prestataireId: prestataire.id,
  userId: client.userId,
  scanId: scan.id,
  note: 5
});

// 6. Mettre à jour les stats
await prestataire.ajouterAvis(5);
await client.incrementerAvis();
await promotion.incrementerUtilisations();
*/

// ==============================================
// REQUÊTES FRÉQUENTES
// ==============================================

/*
// Trouver commerces dans une ville + catégorie
const commerces = await Prestataire.findAll({
  where: { 
    ville: 'Paris',
    estActif: true 
  },
  include: [{ 
    model: Category, 
    as: 'category',
    where: { slug: 'mode-vetements' }
  }],
  order: [['noteGlobale', 'DESC']]
});

// Vérifier si client peut utiliser une promo
const dejaUtilise = await Scan.findOne({
  where: {
    userId: clientId,
    promotionId: promoId
  }
});
if (dejaUtilise) {
  // Promotion déjà utilisée
}

// Historique des scans d'un client
const scans = await Scan.findAll({
  where: { userId: clientId },
  include: [
    { model: Prestataire, as: 'prestataire' },
    { model: Promotion, as: 'promotion' },
    { model: Avis, as: 'avis', required: false }
  ],
  order: [['dateScan', 'DESC']]
});

// Promotion active d'un commerce
const promo = await Promotion.findOne({
  where: {
    prestataireId: commerceId,
    estActive: true,
    dateDebut: { [Op.lte]: new Date() },
    dateFin: { [Op.gte]: new Date() }
  }
});
*/

// ==============================================
// SÉCURITÉ
// ==============================================

/*
✅ Mots de passe hashés (bcrypt, 12 rounds)
✅ Protection brute-force (5 tentatives, 2h lock)
✅ Soft delete (paranoid) sur toutes les tables
✅ Contraintes uniques:
   - 1 QR par client
   - 1 avis par client/commerce
   - 1 scan par client/promotion
✅ Validation stricte:
   - Emails
   - Codes postaux (5 chiffres)
   - Téléphones (format FR)
   - Notes (1-5)
   - Dates promotions
✅ Index sur tous les champs de recherche
*/

// ==============================================
// AVANTAGES DU SYSTÈME
// ==============================================

/*
POUR LES CLIENTS:
✅ 1 seul QR code à montrer
✅ Historique de toutes les visites
✅ Promotions exclusives géolocalisées
✅ Système de notation simple et rapide
✅ Découverte de commerces proches

POUR LES PRESTATAIRES:
✅ Gestion simple des promotions
✅ Stats en temps réel
✅ Historique des clients
✅ Visibilité sur carte interactive
✅ Pas de système de points complexe

POUR LA PLATEFORME:
✅ Traçabilité complète
✅ Données statistiques riches
✅ Pas de fraude possible (1 scan/promo/client)
✅ Engagement client/prestataire
✅ Scalabilité
*/

module.exports = {
   description: 'Système de promotion par QR code avec géolocalisation',
   version: '1.0.0'
};
