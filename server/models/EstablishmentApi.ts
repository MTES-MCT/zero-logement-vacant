export interface EstablishmentApi {
    id: string,
    name: string,
    siren: number,
    housingScopes: string[],
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
    contactedHousingPerCampaign: number,
    firstCampaignSendingDate: Date,
    lastCampaignSendingDate: Date,
    delayBetweenCampaigns: any,
    firstCampaignSentDelay: number
}

export interface LocalityApi {
    geoCode: string,
    name: string
}
