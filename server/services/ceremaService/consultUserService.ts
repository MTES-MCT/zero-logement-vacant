export interface CeremaUser {
  email: string;
  establishmentSiren?: number;
  hasAccount: boolean;
  hasCommitment: boolean;
}

export interface ConsultUserService {
  consultUser(email: string): Promise<CeremaUser>;
}
