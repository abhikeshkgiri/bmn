import { USER_ROLES, type UserRole } from '@/constants/roles';

export function getDashboardPathForRole(role: UserRole): string | null {
  switch (role) {
    case USER_ROLES.SALON_OWNER:
      return '/dashboard/salon';
    case USER_ROLES.SALON_STAFF:
      return null;
    case USER_ROLES.BARBER:
      return '/dashboard/barber';
    case USER_ROLES.ADMIN:
    case USER_ROLES.SUPER_ADMIN:
      return '/admin';
    case USER_ROLES.CUSTOMER:
      return '/dashboard';
  }
}

function isPathForAnotherRole(path: string, role: UserRole): boolean {
  const pathname = path.split('?')[0];
  const isSalonPath = pathname === '/dashboard/salon' || pathname.startsWith('/dashboard/salon/') ||
    pathname === '/salon' || pathname.startsWith('/salon/');
  const isBarberPath = pathname === '/dashboard/barber' || pathname.startsWith('/dashboard/barber/') ||
    pathname === '/barber' || pathname.startsWith('/barber/');
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isCustomerPath = pathname === '/dashboard' ||
    (pathname.startsWith('/dashboard/') && !isSalonPath && !isBarberPath);

  if (isCustomerPath && role !== USER_ROLES.CUSTOMER) return true;
  if (
    isSalonPath &&
    role !== USER_ROLES.SALON_OWNER &&
    role !== USER_ROLES.ADMIN &&
    role !== USER_ROLES.SUPER_ADMIN
  ) return true;
  if (isBarberPath && role !== USER_ROLES.BARBER) return true;
  if (isAdminPath && role !== USER_ROLES.ADMIN && role !== USER_ROLES.SUPER_ADMIN) return true;
  return false;
}

export function getPostLoginPath(role: UserRole, requestedPath?: string | null): string | null {
  const dashboardPath = getDashboardPathForRole(role);
  if (!dashboardPath) return null;
  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) {
    return dashboardPath;
  }
  return isPathForAnotherRole(requestedPath, role) ? dashboardPath : requestedPath;
}
