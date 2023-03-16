export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: number;
  activatedAt?: Date;
}
