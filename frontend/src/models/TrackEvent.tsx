import { CampaignSteps } from './Campaign';

export const TrackEventCategories = {
  Filter: 'Filtre',
  Home: 'Homepage',
  Dashboard: 'Accueil',
  HousingList: 'Base de données',
  Campaigns: 'Logements suivis',
  GeoPerimeters: 'Périmètres',
  ContactPoints: 'Guichet contacts',
  LocalityTaxes: 'Taxes locales',
};

export const TrackEventActions = {
  Filter: (filterLabel: string) => `Filtre par ${filterLabel}`,
  Home: {
    Connection: 'Connexion',
    Join: 'Rejoindre la communauté',
    Rectify: 'Rectifier la situation',
    SelectAddress: "Sélection d'une adresse",
  },
  Dashboard: {
    QuickSearch: 'Recherche rapide',
    SelectAddress: "Sélection d'une adresse",
    Search: 'Recherche',
  },
  HousingList: {
    CreateCampaign: 'Créer la campagne',
    SaveCampaign: 'Enregistrer la campagne',
    DisplayHousing: 'Afficher un logement',
    Search: 'Rechercher un logement',
    MapView: 'Affichage de la cartographie (via le bouton)',
    ListView: 'Affichage de la liste (via le bouton)',
  },
  Campaigns: {
    ValidStep: (step: CampaignSteps) =>
      step === CampaignSteps.Export
        ? 'Exporter la campagne'
        : step === CampaignSteps.Sending
        ? 'Confirmer'
        : `Valider étape ${step}`,
    UpdateHousing: 'Mise à jour de dossier(s)',
    DisplayHousing: 'Afficher un logement',
    Rename: 'Renommer une campagne',
    Delete: 'Supprimer une campagne',
    Archive: 'Archiver une campagne',
  },
  GeoPerimeters: {
    Upload: 'Déposer un fichier',
    Rename: 'Renommer un périmètre',
    Delete: 'Supprimer un périmètre',
  },
  ContactPoints: {
    Create: 'Ajouter un guichet contact',
    Update: 'Modifier un guichet contact',
    Delete: 'Supprimer un guichet contact',
  },
  LocalityTaxes: {
    Update: 'Modifier une taxe locale',
  },
};
