export interface ResetLinkApi {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}
