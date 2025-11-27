export interface ResetLinkDTO {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}
