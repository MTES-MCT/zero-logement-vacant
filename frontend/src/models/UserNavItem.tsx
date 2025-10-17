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
  items?: { url: string; label: string }[];
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
      return { label: 'Analyses', showNewBadge: true, icon: 'ri-bar-chart-2-line', url: '/analyses', items: [
        { url: '/analyses/parc-vacant', label: 'Parc vacant de votre territoire' },
        { url: '/analyses/lutte', label: 'Vos suivis et campagnes' }
      ] };
    default:
      return { url: '/', label: 'Accueil', icon: 'fr-icon-building-line' };
  }
};
