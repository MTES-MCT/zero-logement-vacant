export interface CeremaUser {
  email: string;
  establishmentSiren: number;
  hasAccount: boolean;
  hasCommitment: boolean;
}

export interface ConsultUserService {
  consultUsers(email: string): Promise<CeremaUser[]>;
}
