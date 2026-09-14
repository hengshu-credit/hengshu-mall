const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {sourceState}=require('../../help/release/source-state.cjs');
module.exports=function(kind){
 const root=path.resolve(__dirname,'../..'),file=path.join(root,'.build/commerce-hardening-20260914/build-'+kind+'.json');
 assert(fs.existsSync(file),'Missing current build receipt: '+kind);const receipt=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(receipt.sourceDigest,sourceState(kind).sourceDigest,'Stale '+kind+' build');
 const entry=path.join(receipt.output,kind==='app'?'app-service.js':'index.html');
 assert.equal(receipt.entrySha256,crypto.createHash('sha256').update(fs.readFileSync(entry)).digest('hex'),'Build entry changed');
 return receipt;
};
