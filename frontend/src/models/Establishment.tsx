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
