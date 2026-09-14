const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {checkGate}=require('../../help/release/check-gate.cjs'),{sourceState}=require('../../help/release/source-state.cjs');
const root=path.resolve(__dirname,'../..'),build=path.join(root,'.build');
const dir=fs.mkdtempSync(path.join(build,'gate-test-'));assert(dir.startsWith(build+path.sep));
try{
 assert.throws(()=>checkGate(dir),/missing required verification/);
 const state=sourceState(),receipt={passed:true,unchanged:true,sourceDigest:state.sourceDigest,results:[{name:'fixture',passed:true,skipped:false}]};
 for(const group of ['method','database','http','browser','native'])fs.writeFileSync(path.join(dir,'receipt-'+group+'.json'),JSON.stringify(receipt));
 assert.equal(checkGate(dir).sourceDigest,state.sourceDigest);
 fs.writeFileSync(path.join(dir,'receipt-native.json'),JSON.stringify({...receipt,results:[{name:'native',passed:true,skipped:true}]}));
 assert.throws(()=>checkGate(dir),/native: failed, skipped or stale/);
 fs.writeFileSync(path.join(dir,'receipt-native.json'),JSON.stringify({...receipt,sourceDigest:'old'}));assert.throws(()=>checkGate(dir),/stale/);
 console.log('PASS: missing, skipped and stale mandatory verification block release');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
