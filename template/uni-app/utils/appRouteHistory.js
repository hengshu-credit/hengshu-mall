// Session-only history: tab switches can destroy the native stack without losing this list.
export function createRouteHistory(limit = 100) {
  let entries = [], cursor = -1, revision = 0;
  const current = () => entries[cursor];
  const planAt = index => index >= 0 && index < entries.length && index !== cursor
    ? { index, url: entries[index], revision } : null;
  return {
    current,
    snapshot: () => ({ entries: entries.slice(), cursor, canBack: cursor > 0, canForward: cursor < entries.length - 1 }),
    visit(url) {
      if (!url || url === current()) return;
      entries = entries.slice(0, cursor + 1);
      entries.push(url);
      if (entries.length > limit) entries.splice(1, entries.length - limit);
      cursor = entries.length - 1;
      revision++;
    },
    plan: delta => planAt(cursor + delta),
    planTo(url) {
      for (let i = cursor - 1; i >= 0; i--) if (entries[i] === url) return planAt(i);
      return null;
    },
    commit(move) {
      if (!move || move.revision !== revision || entries[move.index] !== move.url) return false;
      cursor = move.index;
      revision++;
      return true;
    },
  };
}
