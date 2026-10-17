// Public profile usernames (/u/{username}) - mirrors hono-workers validators/user-content.ts
// (isPublicUsername + RESERVED_USERNAMES). The server decides; this is for early feedback and hrefs.
export const RESERVED_USERNAMES = [
  'admin', 'owner', 'account', 'login', 'logout', 'register', 'settings', 'me', 'u', 'api',
  'blog', 'quotes', 'projects', 'family', 'showcase', 'hafiz', 'hafizbahtiar', 'support',
  'help', 'root', 'system', 'null', 'undefined',
];
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** 3-30 lowercase letters/digits, single hyphens inside, not reserved. */
export const isPublicUsername = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 3 && value.length <= 30 &&
  USERNAME_RE.test(value) && !value.includes('--') && !RESERVED_USERNAMES.includes(value);

/** Why a (trimmed, lowercased) username is refused, or null if it's fine. */
export const usernameProblem = (value: string): string | null => {
  if (value.length < 3 || value.length > 30) return 'Use 3-30 characters.';
  if (!USERNAME_RE.test(value) || value.includes('--')) return 'Only lowercase letters, digits and single hyphens (not at the start or end).';
  if (RESERVED_USERNAMES.includes(value)) return 'That username is reserved.';
  return null;
};

/** /u/{username} for an author link, or null when the API sent nothing usable. */
export const profileHref = (username: unknown) => (isPublicUsername(username) ? `/u/${username}` : null);
