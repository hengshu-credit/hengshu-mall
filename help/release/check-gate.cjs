const fs=require('node:fs'),path=require('node:path');
const {sourceState}=require('./source-state.cjs');
const root=path.resolve(__dirname,'../..');
function checkGate(directory=path.join(root,'.build/commerce-hardening-20260914')){
  const state=sourceState(),errors=[];
  for(const group of ['method','database','http','browser','native']){
    const file=path.join(directory,'receipt-'+group+'.json');
    if(!fs.existsSync(file)){errors.push(group+': missing required verification');continue;}
    const receipt=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!receipt.passed||!receipt.unchanged||receipt.sourceDigest!==state.sourceDigest||!receipt.results?.length||receipt.results.some(r=>!r.passed||r.skipped))errors.push(group+': failed, skipped or stale verification');
  }
  if(errors.length)throw Error('Release verification blocked: '+errors.join('; '));
  return state;
}
module.exports={checkGate};
if(require.main===module)console.log(JSON.stringify(checkGate(process.argv[2]),null,2));
