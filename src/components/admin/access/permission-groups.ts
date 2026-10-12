import type { PermissionInfo } from "../../../lib/access";

/** Role administration (roles.*) is owner-only: the backend refuses to grant it. */
export const OWNER_ONLY_MODULE = "roles";

/** Catalogue -> [module, its permissions] in catalogue order. */
export const byModule = (catalogue: PermissionInfo[]) => {
  const map = new Map<string, PermissionInfo[]>();
  catalogue.forEach((p) => map.set(p.module, [...(map.get(p.module) ?? []), p]));
  return [...map.entries()];
};
