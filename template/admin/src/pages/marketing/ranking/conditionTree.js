export const conditionKey=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
export const conditionNodeCount=node=>1+(node.children||[]).reduce((sum,child)=>sum+conditionNodeCount(child),0);
export function conditionTree(form){
  const aliases={category_ids:'product.category_ids',brand_ids:'product.brand_ids',label_ids:'product.label_ids',shop_id:'product.shop_id',type_id:'shop.type_id'};
  const tree=JSON.parse(JSON.stringify(form.condition_tree||{type:'group',mode:form.match_mode||'all',scope:'item',children:(form.conditions||[]).map(c=>({...c,type:'condition',field:aliases[c.field]||c.field}))}));
  const keys=node=>{node._key=conditionKey();(node.children||[]).forEach(keys);};keys(tree);return tree;
}
