import { v4 as uuidv4 } from "uuid";
import { genSiren } from "../test/testFixtures";

export interface ProspectApi {
    email: string
    establishment?: {
        id: string
        siren: number
    }
    hasAccount: boolean
    hasCommitment: boolean
}

export const TEST_ACCOUNTS: ReadonlyArray<ProspectApi> = [
    {
        email: 'ok@beta.gouv.fr',
        establishment: {
            id: uuidv4(),
            siren: genSiren()
        },
        hasAccount: true,
        hasCommitment: true
    },
    {
        email: 'lovac_ko@beta.gouv.fr',
        establishment: {
            id: uuidv4(),
            siren: genSiren()
        },
        hasAccount: true,
        hasCommitment: false
    },
    {
        email: 'account_ko@beta.gouv.fr',
        establishment: {
            id: uuidv4(),
            siren: genSiren()
        },
        hasAccount: false,
        hasCommitment: false
    }
]

export function isTestAccount(email: string): boolean {
    return TEST_ACCOUNTS.map(account => account.email).includes(email)
}

export function isValid(prospect: ProspectApi): boolean {
   return prospect.hasAccount && prospect.hasCommitment
}
