export interface Establishment {
    id: string,
    name: string,
    siren: number,
    housingScopes: HousingScopes,
    localities: {
        geoCode: string,
        name: string
    }[]
}

export interface HousingScopes {
    geom: boolean,
    scopes: string[]
}

export enum LocalityKinds {
    ACV = 'ACV', PVD = 'PVD'
}

export const LocalityKindLabels = {
    [LocalityKinds.ACV]: 'Action Cœur de Ville',
    [LocalityKinds.PVD]: 'Petites Villes de Demain'
}
