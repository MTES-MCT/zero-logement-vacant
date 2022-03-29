export enum UserNavItems {
    Dashboard, Campaign, HousingList
}

export interface UserNavItem {
    url: string;
    label: string;
}

export const getUserNavItem = (userNavItem: UserNavItems): UserNavItem => {
    switch (userNavItem) {
        case UserNavItems.Dashboard:
            return {url: '/accueil', label: 'Accueil'}
        case UserNavItems.Campaign:
            return {url: '/campagnes', label: 'Logements suivis'}
        case UserNavItems.HousingList:
            return {url: '/logements', label: 'Base de données'}
        default:
            return {url: '/', label: 'Accueil'}
    }
}
