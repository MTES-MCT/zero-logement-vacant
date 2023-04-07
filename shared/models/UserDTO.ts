export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: number;
  activatedAt: string;
  establishmentId?: string;
}
