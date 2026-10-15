import { USER_ROLES, type UserRole } from '@/constants/roles';

export function canUpdateAccountProfile(role: UserRole): boolean {
  return role === USER_ROLES.CUSTOMER || role === USER_ROLES.SALON_OWNER;
}
