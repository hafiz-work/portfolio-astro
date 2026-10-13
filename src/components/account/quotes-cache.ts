import type { Quote } from "../../types/quotes";

// The signed-in user's quotes, kept between ClientRouter navigations (modules aren't
// reloaded), so returning from the form shows the list at once instead of a skeleton.
// null = never loaded on this page visit (a full load starts empty -> skeleton).
export const quotesCache: { list: Quote[] | null } = { list: null };

/** Put a just-saved quote into the cached list (replace in place, or add on top). */
export const rememberQuote = (q: Quote) => {
  const list = quotesCache.list;
  if (!list) return;
  quotesCache.list = list.some((x) => x.id === q.id) ? list.map((x) => (x.id === q.id ? q : x)) : [q, ...list];
};
