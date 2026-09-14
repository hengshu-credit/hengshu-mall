const fs=require('node:fs'),path=require('node:path');
const {root,transform}=require('./theme_component_harness.cjs');
const cache={};
function load(file){if(!file.endsWith('.js'))file+='.js';if(cache[file])return cache[file].exports;const mod=cache[file]={exports:{}};new Function('module','exports','require',transform(fs.readFileSync(file,'utf8')))(mod,mod.exports,id=>load(path.resolve(path.dirname(file),id)));return mod.exports;}
module.exports={loadShared:name=>load(path.join(root,'template/shared',name))};
