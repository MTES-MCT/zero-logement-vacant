export interface EstablishmentApi {
    id: string,
    name: string,
    siren: number,
    housingScopes: HousingScopesApi,
    localities: LocalityApi[]
}

export interface EstablishmentDataApi {
    id: string,
    name: string,
    housingCount: number,
    firstActivatedAt: Date,
    lastAuthenticatedAt: Date,
    lastMonthUpdatesCount: number,
    campaignsCount: number,
    contactedHousingCount: number,
    firstCampaignSentAt: Date,
    lastCampaignSentAt: Date
}

export interface HousingScopesApi {
    geom: boolean,
    scopes: string[]
}


export interface LocalityApi {
    geoCode: string,
    name: string
}
