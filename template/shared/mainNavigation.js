// Shared by the managed H5 footer and native page footers.
export function navigationPath(url = "") {
  return url.split("?")[0];
}

function query(url) {
  const result = {};
  (url.split("?")[1] || "")
    .split("&")
    .filter(Boolean)
    .forEach((pair) => {
      const equals = pair.indexOf("=");
      try {
        const decode = (value) => decodeURIComponent(value.replace(/\+/g, " "));
        result[decode(equals < 0 ? pair : pair.slice(0, equals))] = decode(
          equals < 0 ? "" : pair.slice(equals + 1)
        );
      } catch (_) {
        /* Ignore malformed query pairs from legacy links. */
      }
    });
  return result;
}

export function activeNavigationIndex(menus = [], url = "") {
  const current = query(url);
  let selected = -1,
    specificity = -1;
  menus.forEach((menu, index) => {
    if (navigationPath(menu.link || "") !== navigationPath(url)) return;
    const expected = query(menu.link || "");
    const keys = Object.keys(expected);
    if (
      keys.length > specificity &&
      keys.every((key) => current[key] === expected[key])
    ) {
      selected = index;
      specificity = keys.length;
    }
  });
  return selected;
}

export function navigationVisible(config, url, legacyVisible = true) {
  if (
    !config ||
    config.isHide ||
    !config.effectConfig ||
    !Number(config.effectConfig.tabVal) ||
    !Array.isArray(config.menuList) ||
    !config.menuList.length
  )
    return false;
  if (!config.mainNavigation) return legacyVisible;
  if (config.mainNavigation.pageScoped) return true;
  return (config.mainNavigation.visiblePages || []).includes(
    navigationPath(url)
  );
}

export function navigationPage(url = '') {
  const path = navigationPath(url);
  return ({ '/pages/index/index': 'home', '/pages/goods_cate/goods_cate': 'category', '/pages/user/index': 'user', '/pages/order_addcart/order_addcart': 'cart', '/pages/goods_details/index': 'detail' })[path] || 'other';
}

// Accumulate movement in one direction so small scroll jitter does not toggle the dock.
export function navigationScroll(config, previous = {}, value = 0) {
  const top = Math.max(0, Number(value) || 0);
  const delta = top - (previous.top || 0), direction = Math.sign(delta);
  const distance = direction === previous.direction ? (previous.distance || 0) + Math.abs(delta) : Math.abs(delta);
  let collapsed = !!previous.collapsed;
  if (config.scrollMode !== 'smart' || top <= 160) collapsed = false;
  else if (direction > 0 && distance >= 120) collapsed = true;
  else if (direction < 0 && distance >= 32) collapsed = false;
  return { top, direction, distance, collapsed };
}
