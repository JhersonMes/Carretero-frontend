import { Role } from './role';

export interface User {
  idUser: number;
  username: string;
  email: string;
  password?: string;
  fullName?: string;
  phone?: string;
  enabled?: boolean;
  role: Role;
}
