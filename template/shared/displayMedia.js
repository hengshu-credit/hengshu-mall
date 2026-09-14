// Display URLs only. Stored uploads and admin editing retain the original bytes/URLs.
export function displayImageUrl(value, origin) {
  if (typeof value !== 'string') return value;
  const base = origin.replace(/\/$/, '');
  let path = value.startsWith(base + '/') ? value.slice(base.length) : value;
  if (path.startsWith('/_compat/images/uploads/')) path = path.slice('/_compat/images'.length);
  if (!/^\/uploads\/[^?#]+\.avif(?:[?#].*)?$/i.test(path)) return value;
  return base + '/api/media/image?path=' + encodeURIComponent(path.split(/[?#]/)[0]);
}

export function displayMedia(value, origin) {
  if (Array.isArray(value)) return value.map(item => displayMedia(item, origin));
  if (value && typeof value === 'object') {
    const output = {};
    Object.keys(value).forEach(key => { output[key] = displayMedia(value[key], origin); });
    return output;
  }
  if (typeof value !== 'string') return value;
  if (value.includes('<img')) return value.replace(/(\bsrc\s*=\s*["'])([^"']+)(["'])/gi,
    (match, prefix, url, suffix) => prefix + displayImageUrl(url, origin) + suffix);
  return displayImageUrl(value, origin);
}
