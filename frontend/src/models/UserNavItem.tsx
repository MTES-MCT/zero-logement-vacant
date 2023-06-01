export enum UserNavItems {
  Dashboard,
  Campaign,
  HousingList,
  User,
  Monitoring,
  EstablishmentMonitoring,
  Establishment,
  Resources,
  EstablishmentHome,
  OwnerHome,
  Inbox,
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
    case UserNavItems.EstablishmentHome:
      return { url: '/collectivites', label: 'Collectivités' };
    case UserNavItems.OwnerHome:
      return { url: '/proprietaires', label: 'Propriétaires' };
    case UserNavItems.Campaign:
      return { url: '/campagnes', label: 'Campagnes' };
    case UserNavItems.HousingList:
      return { url: '/parc-de-logements', label: 'Parc de logements' };
    case UserNavItems.Establishment:
      return {
        url: '/informations-publiques',
        label: 'Informations publiques',
      };
    case UserNavItems.Inbox:
      return { url: '/boite-de-reception', label: 'Boite de réception' };
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
