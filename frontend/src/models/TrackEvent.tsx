import { CampaignSteps } from './Campaign';

export const TrackEventCategories = {
  Filter: 'Filtre',
  Home: 'Homepage',
  AccountCreation: 'Création de compte',
  OwnerProspect: 'Propriétaire',
  Group: 'Groupe',
  HousingList: 'Base de données',
  Housing: 'Fiche logement',
  Campaigns: 'Campagnes',
  GeoPerimeters: 'Périmètres',
  ContactPoints: 'Guichet contacts',
  LocalityTaxes: 'Taxes locales',
};

export const TrackEventActions = {
  Filter: (filterLabel: string) => `Filtre par ${filterLabel}`,
  Home: {
    Connection: 'Connexion',
    CreateAccount: 'Créer un compte',
    SelectAddress: "Sélection d'une adresse",
    Webinar: 'Redirection inscription webinaire',
    Newsletter: 'Redirection inscription newsletter',
  },
  AccountCreation: {
    SendEmail: 'Envoi mail',
    SubmitPassword: 'Validation du mot de passe',
    SubmitCampaignIntent: 'Validation des intentions',
  },
  OwnerProspect: {
    SubmitContact: 'Formulaire contact complété',
  },
  HousingList: {
    CreateCampaign: 'Créer la campagne',
    SaveCampaign: 'Enregistrer la campagne',
    DisplayHousing: 'Afficher un logement',
    Search: 'Rechercher un logement',
    MapView: 'Affichage de la cartographie (via le bouton)',
    ListView: 'Affichage de la liste (via le bouton)',
    UpdateList: 'Mise à jour groupée (depuis parc de logements)',
    Update: 'Mise à jour (depuis parc de logements)',
  },
  Housing: {
    Update: 'Mise à jour (depuis fiche logement)',
  },
  Campaigns: {
    ValidStep: (step: CampaignSteps) =>
      step === CampaignSteps.Export
        ? 'Exporter la campagne'
        : step === CampaignSteps.Sending
        ? 'Confirmer'
        : `Valider étape ${step}`,
    UpdateList: 'Mise à jour groupée (depuis campagne)',
    Update: 'Mise à jour (depuis campagne)',
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
