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

export interface EstablishmentData {
    id: string,
    name: string,
    housingCount: number,
    firstActivatedAt: Date,
    lastAuthenticatedAt: Date,
    lastMonthUpdatesCount: number,
    campaignsCount: number,
    contactedHousingCount: number,
    contactedHousingPerCampaign: number,
    firstCampaignSentAt: Date,
    lastCampaignSentAt: Date,
    delayBetweenCampaigns: any
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
