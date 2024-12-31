export enum UserNavItems {
  Campaign,
  HousingList,
  Resources,
  Analysis
}

export interface UserNavItem {
  url: string;
  label: string;
  showNewBadge?: boolean;
}

export const getUserNavItem = (userNavItem: UserNavItems): UserNavItem => {
  switch (userNavItem) {
    case UserNavItems.Campaign:
      return { url: '/campagnes', label: 'Campagnes' };
    case UserNavItems.HousingList:
      return { url: '/parc-de-logements', label: 'Parc de logements' };
    case UserNavItems.Resources:
      return { url: '/ressources', label: 'Ressources' };
    case UserNavItems.Analysis:
      return { url: '/analyses', label: 'Analyses', showNewBadge: true };
    default:
      return { url: '/', label: 'Accueil' };
  }
};
