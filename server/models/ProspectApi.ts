export interface ProspectApi {
    email: string
    establishment?: {
        id: string
        siren: number
    }
    hasAccount: boolean
    hasCommitment: boolean
}
