import { ALL_PERMISSIONS, Permission } from './permissions';

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

/** True when the user holds the SUPER_ADMIN role. */
export function isSuperAdmin(roles: string[] | undefined | null): boolean {
  return !!roles?.includes(SUPER_ADMIN_ROLE);
}

/**
 * Resolves the effective permission keys for a set of roles.
 *
 * SUPER_ADMIN always resolves to the full permission catalog, regardless of what
 * is stored on the role. This keeps the bypass authoritative even if the stored
 * grants drift, and means newly added permissions are picked up automatically.
 */
export function resolvePermissions(
  roles: string[] | undefined | null,
  granted: string[],
): string[] {
  if (isSuperAdmin(roles)) return [...ALL_PERMISSIONS];
  return Array.from(new Set(granted));
}

/** True when `target` grants nothing the actor cannot already grant. */
export function isSubsetOf(candidate: string[], actorPermissions: string[]): boolean {
  const actor = new Set(actorPermissions);
  return candidate.every((p) => actor.has(p));
}

/** Rejects permission keys that are not part of the application catalog. */
export function unknownPermissions(keys: string[]): string[] {
  const known = new Set<string>(ALL_PERMISSIONS);
  return keys.filter((k) => !known.has(k));
}

export { Permission };
