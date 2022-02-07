export interface EstablishmentApi {
    id: string,
    name: string,
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
