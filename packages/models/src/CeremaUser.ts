export interface CeremaUser {
  email: string;
  establishmentSiren: string;
  establishmentId: string | null;
  hasAccount: boolean;
  hasCommitment: boolean;
  cguValid: boolean;
  isValid: boolean;
}
