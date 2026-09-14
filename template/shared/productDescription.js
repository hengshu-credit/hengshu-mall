// Used at editor save time and at display time for descriptions already in the database.
export function fullWidthDescriptionImages(html) {
  if (typeof html !== 'string') return '';
  return html.replace(/<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi, (tag) => {
    const attributes = tag.slice(4).replace(/\s+(?:style|width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return '<img style="width:100%;max-width:100%;height:auto;max-height:none;display:block;margin:0;"' + attributes;
  });
}
