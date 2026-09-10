// Keep a slow response for a previous preview theme from recoloring the current page.
export function createPaletteRefresher(load, apply, now = () => Date.now()) {
  let currentKey = null,
    sequence = 0,
    pending = null,
    lastSuccess = -Infinity;
  return function refresh(id = 0, force = false) {
    const key = String(id || 0);
    if (key === currentKey && pending) return pending;
    if (!force && key === currentKey && now() - lastSuccess < 1000)
      return Promise.resolve(null);
    currentKey = key;
    const request = ++sequence;
    pending = Promise.resolve()
      .then(() => load(id || 0))
      .then((data) => {
        if (request === sequence) {
          apply(data);
          lastSuccess = now();
        }
        return data;
      })
      .finally(() => {
        if (request === sequence) pending = null;
      });
    return pending;
  };
}
