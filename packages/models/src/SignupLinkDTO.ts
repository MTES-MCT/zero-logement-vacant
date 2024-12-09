export interface SignupLinkDTO {
  id: string;
  prospectEmail: string;
  expiresAt: Date;
}

export interface SignupLinkPayloadDTO {
  email: string;
}
