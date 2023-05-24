export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  establishmentId?: string;
  role: number;
  activatedAt?: Date;
}
