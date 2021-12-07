export interface EstablishmentApi {
    id: number,
    name: string,
    housingScopes: string[],
    localities: LocalityApi[]
}

export interface LocalityApi {
    geoCode: string,
    name: string
}
