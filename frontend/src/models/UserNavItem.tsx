export enum UserNavItems {
  Campaign,
  HousingList,
  Establishment,
  EstablishmentHome,
  OwnerHome,
  Inbox,
}

export interface UserNavItem {
  url: string;
  label: string;
}

export const getUserNavItem = (userNavItem: UserNavItems): UserNavItem => {
  switch (userNavItem) {
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
    default:
      return { url: '/', label: 'Accueil' };
  }
};
