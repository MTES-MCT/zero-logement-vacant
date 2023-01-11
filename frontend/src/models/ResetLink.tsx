export interface ResetLink {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}
