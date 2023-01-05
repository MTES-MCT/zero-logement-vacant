export enum UserNavItems {
  Dashboard,
  Campaign,
  HousingList,
  User,
  Monitoring,
  EstablishmentMonitoring,
  Establishment,
  Resources,
}

export interface UserNavItem {
  url: string;
  label: string;
}

export const getUserNavItem = (
  userNavItem: UserNavItems,
  establishmentId?: string
): UserNavItem => {
  switch (userNavItem) {
    case UserNavItems.Dashboard:
      return { url: '/accueil', label: 'Accueil' };
    case UserNavItems.Campaign:
      return { url: '/campagnes', label: 'Logements suivis' };
    case UserNavItems.HousingList:
      return { url: '/base-de-donnees', label: 'Base de données' };
    case UserNavItems.Establishment:
      return { url: '/territoire', label: 'Votre territoire' };
    case UserNavItems.User:
      return { url: '/utilisateurs', label: 'Utilisateurs' };
    case UserNavItems.Monitoring:
      return { url: '/suivi', label: 'Suivi' };
    case UserNavItems.EstablishmentMonitoring:
      return { url: `/suivi/etablissement/${establishmentId}`, label: 'Suivi' };
    case UserNavItems.Resources:
      return { url: '/ressources', label: 'Ressources' };
    default:
      return { url: '/', label: 'Accueil' };
  }
};
