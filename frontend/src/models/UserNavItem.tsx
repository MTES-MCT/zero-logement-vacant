export enum UserNavItems {
    Dashboard, Campaign, HousingList, User, Monitoring
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
            return {url: '/base-de-donnees', label: 'Base de données'}
        case UserNavItems.User:
            return {url: '/utilisateurs', label: 'Utilisateurs'}
        case UserNavItems.Monitoring:
            return {url: '/suivi', label: 'Suivi'}
        default:
            return {url: '/', label: 'Accueil'}
    }
}
