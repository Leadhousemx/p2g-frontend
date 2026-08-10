type UserLike = {
  rol?: string;
  role?: string;
} | null | undefined;

export function getUserRole(user: UserLike): string {
  return String(user?.rol || user?.role || "").toLowerCase();
}

export function isAdminRole(user: UserLike): boolean {
  const role = getUserRole(user);
  return role === "admin" || role === "administrador" || role === "owner";
}

export function isVentasRole(user: UserLike): boolean {
  return getUserRole(user) === "ventas";
}

export function canViewReports(user: UserLike): boolean {
  return !isVentasRole(user);
}

export function canManageCompany(user: UserLike): boolean {
  return !isVentasRole(user);
}

export function canDeleteRecords(user: UserLike): boolean {
  return !isVentasRole(user);
}

export function canInviteUsers(user: UserLike): boolean {
  return !isVentasRole(user);
}

export function canManageUsers(user: UserLike): boolean {
  return !isVentasRole(user);
}
