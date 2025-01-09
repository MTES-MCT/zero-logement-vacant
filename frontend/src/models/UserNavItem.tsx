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
  icon: string;
}

export const getUserNavItem = (userNavItem: UserNavItems): UserNavItem => {
  switch (userNavItem) {
    case UserNavItems.Campaign:
      return { url: '/campagnes', label: 'Campagnes', icon: 'fr-icon-mail-line' };
    case UserNavItems.HousingList:
      return { url: '/parc-de-logements', label: 'Parc de logements', icon: 'fr-icon-building-line' };
    case UserNavItems.Resources:
      return { url: '/ressources', label: 'Ressources', icon: 'fr-icon-information-line' };
    case UserNavItems.Analysis:
      return { url: '/analyses', label: 'Analyses', showNewBadge: true, icon: 'fr-icon-bar-chart-box-line' };
    default:
      return { url: '/', label: 'Accueil', icon: 'fr-icon-building-line' };
  }
};
