import { USER_ROLES, type UserRole } from '@/constants/roles';

export function canManageSalon(ownerId: string, actorId: string, actorRole: UserRole): boolean {
  return (
    (actorRole === USER_ROLES.SALON_OWNER && ownerId === actorId) ||
    actorRole === USER_ROLES.ADMIN ||
    actorRole === USER_ROLES.SUPER_ADMIN
  );
}
