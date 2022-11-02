import { EstablishmentApi } from "./EstablishmentApi";

export interface ProspectApi {
    email: string,
    establishment?: Pick<EstablishmentApi, 'id' | 'siren'>
    establishmentSiren?: number,
    hasAccount: boolean,
    hasCommitment: boolean
}
