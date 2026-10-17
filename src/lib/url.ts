/** Set (or with a falsy value drop) one query param without a navigation - event handlers only. */
export function setParam(name: string, value: string | null | undefined) {
  const url = new URL(location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  history.replaceState(history.state, "", url);
}
