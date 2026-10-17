// bun scripts/check-username.ts - public-profile username rules (src/lib/username.ts).
import { expect } from "bun:test";
import { isPublicUsername, profileHref, usernameProblem } from "../src/lib/username";

for (const v of ["abc", "hafiz-b", "a1b2", "x".repeat(30)]) {
  expect(isPublicUsername(v), `accept ${v}`).toBe(true);
  expect(usernameProblem(v), `no problem for ${v}`).toBeNull();
}
for (const v of ["ab", "x".repeat(31), "-abc", "abc-", "a--b", "Abc", "a_b", "a b", "admin", "u", "hafizbahtiar", "", null, 3])
  expect(isPublicUsername(v), `refuse ${String(v)}`).toBe(false);
expect(usernameProblem("admin"), "reserved message").toBe("That username is reserved.");
expect(profileHref("abc"), "profileHref ok").toBe("/u/abc");
expect(profileHref("../x"), "profileHref traversal").toBeNull();
expect(profileHref(null), "profileHref null").toBeNull();
console.log("username: ok");
