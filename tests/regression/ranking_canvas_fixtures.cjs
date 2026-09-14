const fs=require('node:fs'),path=require('node:path');const {loadShared}=require('./ranking_shared_loader.cjs');
const {canvasPreset,assertCanvas}=loadShared('rankingCanvas');const dir=path.resolve(__dirname,'../../.build/ranking-review');fs.mkdirSync(dir,{recursive:true});
const scenes=Object.fromEntries(['tmall_product','tmall_shop','dianping_shop'].map(type=>[type,canvasPreset(type)]));Object.values(scenes).forEach(assertCanvas);fs.writeFileSync(path.join(dir,'canvas-fixtures.json'),JSON.stringify(scenes));
for(const [name,scene] of Object.entries(scenes))fs.writeFileSync(path.join(dir,'canvas-'+name+'.json'),JSON.stringify(scene,null,2));
