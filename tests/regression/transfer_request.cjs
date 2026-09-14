const {test}=require('node:test'),assert=require('node:assert/strict');
const {transferRequest}=require('./ranking_shared_loader.cjs').loadShared('transferRequest');
test('lost response reuses transfer identity and confirmed success permits a new transfer',()=>{
  const records={};const storage={getStorageSync:k=>records[k],setStorageSync:(k,v)=>records[k]=v,removeStorageSync:k=>delete records[k]};
  const a=transferRequest({type:1,price:'20.00'},101,storage),retry=transferRequest({type:1,price:'20.00'},101,storage);
  assert.equal(a.payload.operation_key,retry.payload.operation_key);
  transferRequest({type:1,price:'30.00'},101,storage);
  assert.equal(transferRequest({type:1,price:'20.00'},101,storage).payload.operation_key,a.payload.operation_key,'another amount cannot discard unresolved request identity');
  const other=transferRequest({type:1,price:'20.00'},202,storage);assert.notEqual(other.payload.operation_key,a.payload.operation_key);
  retry.complete();assert.notEqual(transferRequest({type:1,price:'20.00'},101,storage).payload.operation_key,a.payload.operation_key);
  assert.deepEqual(transferRequest({type:0,price:'20.00'},101,storage).payload,{type:0,price:'20.00'});
});
