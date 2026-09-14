// Core page modules retain their legacy fields. Repeated content owns independent settings.
export function pageContentModules(config, page) {
  const repeat = page === 'category' ? 'search' : 'service';
  const core = page === 'category' ? 'category' : 'list';
  const modules = [];
  if (config['show_' + repeat]) modules.push({ id: repeat, type: repeat, config: repeat === 'search' ? config.search_component : config });
  if (config['show_' + core]) modules.push({ id: core, type: core, config });
  (config.extra_modules || []).forEach(item => modules.push({ ...item, type: repeat }));
  const order = config.content_order || [];
  const rank = id => order.includes(id) ? order.indexOf(id) : order.length + modules.findIndex(item => item.id === id);
  return modules.sort((a, b) => rank(a.id) - rank(b.id));
}

export function normalizeModuleOrder(value, core, extras = []) {
  const allowed = [...core, ...extras.map(item => item.id)];
  return [...new Set([...(Array.isArray(value) ? value : []), ...allowed])].filter(id => allowed.includes(id));
}
