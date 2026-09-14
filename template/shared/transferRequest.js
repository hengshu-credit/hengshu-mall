// Persist one request identity until the server acknowledges it, including after a lost response.
export function transferRequest(data, uid, storage) {
  if (Number(data.type) !== 1 || data.operation_key) return {payload:data,complete(){}};
  const amount=String(data.price);
  const slot='brokerage-transfer-'+String(uid)+'-'+encodeURIComponent(amount);
  const saved=storage.getStorageSync(slot);
  const record=saved && saved.amount===amount ? saved : {amount,key:'transfer_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+'_'+Math.random().toString(36).slice(2)};
  storage.setStorageSync(slot,record);
  return {payload:{...data,operation_key:record.key},complete(){const current=storage.getStorageSync(slot);if(current&&current.key===record.key)storage.removeStorageSync(slot);}};
}
