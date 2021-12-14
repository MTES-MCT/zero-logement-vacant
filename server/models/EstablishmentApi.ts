export interface EstablishmentApi {
    id: string,
    name: string,
    housingScopes: string[],
    localities: LocalityApi[]
}

export interface LocalityApi {
    geoCode: string,
    name: string
}
