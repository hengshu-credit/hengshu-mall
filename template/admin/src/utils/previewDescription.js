import {fullWidthDescriptionImages} from '../../../shared/productDescription';

export function previewDescription(html) {
  if(!html)return '';
  const doc=new DOMParser().parseFromString(html,'text/html');
  const tags=new Set(['P','DIV','SPAN','BR','IMG','STRONG','B','I','EM','U','S','UL','OL','LI','TABLE','TBODY','THEAD','TR','TH','TD','H1','H2','H3','H4','H5','H6','BLOCKQUOTE']);
  for(const node of Array.from(doc.body.querySelectorAll('*'))){
    if(['SCRIPT','IFRAME','OBJECT','EMBED','STYLE','LINK','META'].includes(node.tagName)){node.remove();continue;}
    if(!tags.has(node.tagName)){node.replaceWith(...node.childNodes);continue;}
    const safeStyle={};
    for(const property of ['color','background-color','font-size','font-weight','line-height','text-align','margin','padding','border','border-collapse','width','max-width','height']){
      const value=node.style.getPropertyValue(property);if(value&&!/url\s*\(|expression|javascript|@import/i.test(value))safeStyle[property]=value;
    }
    for(const attr of Array.from(node.attributes)){
      if(!['src','alt','title','colspan','rowspan'].includes(attr.name))node.removeAttribute(attr.name);
      else if(attr.name==='src'&&!/^(?:https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(attr.value))node.removeAttribute('src');
    }
    for(const [property,value] of Object.entries(safeStyle))node.style.setProperty(property,value);
  }
  return fullWidthDescriptionImages(doc.body.innerHTML);
}
