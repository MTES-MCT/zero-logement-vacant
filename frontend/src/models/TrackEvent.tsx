import { CampaignSteps } from './Campaign';

export const TrackEventCategories = {
  Filter: 'Filtre',
  Home: 'Homepage',
  Dashboard: 'Accueil',
  HousingList: 'Base de données',
  Campaigns: 'Logements suivis',
  GeoPerimeters: 'Périmètres',
};

export const TrackEventActions = {
  Filter: (filterLabel: string) => `Filtre par ${filterLabel}`,
  Home: {
    Connection: 'Connexion',
    Join: 'Rejoindre la communauté',
    Rectify: 'Rectifier la situation',
  },
  Dashboard: {
    QuickSearch: 'Recherche rapide',
  },
  HousingList: {
    CreateCampaign: 'Créer la campagne',
    SaveCampaign: 'Enregistrer la campagne',
    DisplayHousing: 'Afficher un logement',
    Search: 'Rechercher un logement',
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
};
