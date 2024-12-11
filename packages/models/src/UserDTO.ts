export interface UserDTO {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  establishmentId?: string;
  role: number;
  activatedAt?: string;
  disabled?: boolean;
}

export interface UserAccountDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  timePerWeek?: string;
}
