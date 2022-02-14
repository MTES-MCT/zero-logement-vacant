export interface EstablishmentApi {
    id: string,
    name: string,
    siren: number,
    housingScopes: HousingScopesApi,
    localities: LocalityApi[]
}

export interface HousingScopesApi {
    geom: boolean,
    scopes: string[]
}


export interface LocalityApi {
    geoCode: string,
    name: string
}
