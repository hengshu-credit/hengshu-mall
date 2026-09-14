// Declarative ranking scenes: coordinates are measured on one fixed design canvas.
export const canvasKinds = { group: '容器 / 背景', text: '文字 / 指标', image: '图片', button: '按钮', stars: '星级评分', tabs: '榜单切换', products: '店铺商品组' };
export const canvasBindings = {
  '': '静态内容', 'ranking.name': '榜单名称', 'ranking.description': '榜单说明', 'ranking.window_days': '统计天数',
  'item.name': '商品 / 店铺名称', 'item.image': '商品 / 店铺图片', 'item.price': '商品价格', 'item.rank': '真实名次',
  'item.score': '综合得分', 'item.sales': '成交件数', 'item.reviews': '评价数', 'item.rating': '好评率',
  'item.rating_score': '真实评价均分', 'item.type_name': '店铺类型', 'item.product_count': '在售商品数',
  'item.shop_description': '店铺简介', 'item.review_excerpt': '公开评价摘要', 'owner.name': '所属榜单条目名称', 'owner.rank': '所属榜单条目名次', 'state.message': '加载 / 空状态信息',
};
export function canvasStyle() {
  return { x: 0, y: 0, width: 100, height: 30, zIndex: 0, opacity: 1, rotate: 0,
    background: 'transparent', background2: 'transparent', backgroundImage: '', backgroundMode: 'solid', backgroundFit: 'cover', backgroundPosition:'center', angle: 90,
    borderWidth: 0, borderColor: '#dddddd', borderStyle: 'solid', radiusTL: 0, radiusTR: 0, radiusBR: 0, radiusBL: 0,
    shadow: false, shadowColor: '#dddddd', shadowX: 0, shadowY: 2, shadowBlur: 8,
    color: '#333333', fontSize: 14, fontWeight: 400, fontFamily: '', fontStyle:'normal', textDecoration:'none', lineHeight: 1.4, letterSpacing: 0,
    textAlign: 'left', verticalAlign: 'top', paddingX: 0, paddingY: 0, textShadow: false, textShadowColor: '#333333', textShadowX: 0, textShadowY: 1, textShadowBlur: 2,
    fit: 'cover', clip: 'none', overflow: 'hidden', lines: 2,
    grayscale:0, sepia:0, hueRotate:0, saturation:1, brightness:1,
    activeColor: '#e5c891', activeBackground: 'transparent', indicatorColor: '#e5c891', indicatorWidth: 16, indicatorHeight: 3,
    starEmptyColor: '#dddddd', columns: 3, gap: 10, imageHeight: 108, productRadius: 8,
    priceColor: '#222222', priceSize: 15, productTextColor: '#555555', productTextSize: 12, productCaptionBackground: '#fff5de', productDesignWidth:108, productItemHeight:140,
  };
}
export function canvasNode(kind = 'text', value = {}) {
  const result = { id: 'node_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), label: canvasKinds[kind] || '元素', kind,
    visible: true, text: '', binding: '', prefix: '', suffix: '', decimals: -1, image: '', hideWhenEmpty: true,
    action: kind === 'products' ? 'product' : 'none', link: '', count: 3, showProductName: false, showProductPrice: true, productCaption: '',
    children: [], productNodes: [], rankStyles: [], ...value, style: { ...canvasStyle(), ...(value.style || {}) } };
  result.rankStyles=JSON.parse(JSON.stringify(result.rankStyles));
  if(kind==='products' && value.productNodes===undefined) result.productNodes=[
    canvasNode('image',{label:'商品组 / 实物图',binding:'item.image',action:'product',style:{x:0,y:0,width:108,height:106,fit:'contain',background:'#ffffff',radiusTL:7,radiusTR:7,radiusBL:7,radiusBR:7}}),
    canvasNode('text',{label:'商品组 / 图片标签',text:value.productCaption||'销量 {sales}',action:'product',visible:!!value.productCaption,style:{x:0,y:87,width:108,height:19,fontSize:12,color:'#867344',background:'#fff4d7',textAlign:'center',verticalAlign:'center'}}),
    canvasNode('text',{label:'商品组 / 商品名称',binding:'item.name',action:'product',visible:!!value.showProductName,style:{x:0,y:109,width:108,height:16,fontSize:12,lines:1,textAlign:'center'}}),
    canvasNode('text',{label:'商品组 / 商品价格',binding:'item.price',action:'product',prefix:'¥',visible:value.showProductPrice!==false,style:{x:0,y:value.showProductName?127:112,width:108,height:23,fontSize:15,fontWeight:600,textAlign:'center'}}),
  ];
  return result;
}
export function canvasDefaults() {
  return { enabled: false, version: 1, designWidth: 375, fontFamily: 'Arial, "Microsoft YaHei", sans-serif', fontUrl: '', fonts: [],
    background: '#111111', backgroundImage: '', backgroundFit: 'cover', paddingTop: 0, paddingBottom: 0,
    tabs: [], header: { height: 170, nodes: [] }, card: { height: 200, gap: 10, heights: [], nodes: [] }, footer: { height: 0, nodes: [] }, empty: { height: 80, nodes: [] } };
}
export function normalizeCanvas(value = {}) {
  const base = canvasDefaults(); const result = { ...base, ...value };
  for (const key of ['header','card','footer','empty']) result[key] = { ...base[key], ...(value[key] || {}), nodes: ((value[key] || {}).nodes || []).map(normalizeNode) };
  result.tabs = (value.tabs || []).map(tab => ({ label: '', rankingId: 0, ...tab }));
  return result;
}
export function assertCanvas(scene) {
  if(!scene||typeof scene!=='object'||scene.version!==1||!Number.isFinite(scene.designWidth)||scene.designWidth<280||scene.designWidth>750)throw Error('画布版本或宽度不正确');
  const url=value=>typeof value==='string'&&value.length<=1000&&(value===''||/^(?:\/(?!\/)|https?:\/\/)[^\s<>"'\\]+$/.test(value));
  if(!url(scene.fontUrl||'')||!url(scene.backgroundImage||''))throw Error('素材或字体地址不正确');
  if(!Array.isArray(scene.fonts||[])||(scene.fonts||[]).length>6)throw Error('最多配置6种字体');
  for(const font of scene.fonts||[])if(typeof font.family!=='string'||!font.family.trim()||!url(font.url))throw Error('字体资源不正确');
  const base=canvasStyle();const checkStyle=style=>{if(!style||typeof style!=='object'||Array.isArray(style))throw Error('图层样式不正确');for(const [key,value] of Object.entries(style)){if(!(key in base))throw Error('未知样式属性：'+key);if(typeof base[key]==='number'&&(!Number.isFinite(value)||value < -2000||value>3000))throw Error('样式数值不正确：'+key);if(typeof base[key]==='boolean'&&typeof value!=='boolean')throw Error('样式开关不正确：'+key);if(typeof base[key]==='string'&&typeof value!=='string')throw Error('样式文字不正确：'+key);}if(style.backgroundImage&&!url(style.backgroundImage))throw Error('背景图片地址不正确');};
  const checkRanges=rules=>{if(!Array.isArray(rules)||rules.length>20)throw Error('名次覆盖格式不正确');const used=new Set();rules.forEach(rule=>{if(!Number.isInteger(rule.from)||!Number.isInteger(rule.to)||rule.from<1||rule.to>100||rule.to<rule.from)throw Error('名次范围不正确');for(let n=rule.from;n<=rule.to;n++){if(used.has(n))throw Error('同一元素的名次覆盖不能重叠');used.add(n);}if(rule.style)checkStyle(rule.style);});};
  let count=0;const ids=new Set();const walk=(nodes,depth)=>{if(!Array.isArray(nodes)||depth>6)throw Error('图层结构不正确');nodes.forEach(node=>{if(++count>150||!canvasKinds[node.kind]||typeof node.id!=='string'||!node.id||ids.has(node.id))throw Error('图层类型、编号或数量不正确');ids.add(node.id);checkStyle(node.style);for(const key of ['x','y','width','height'])if(!Number.isFinite(node.style[key]))throw Error('图层坐标尺寸不正确');if(!(node.binding in canvasBindings)||typeof node.text!=='string'||!url(node.image||''))throw Error('文字、图片或绑定不正确');if(!['none','product','shop','ranking','rules','back','link'].includes(node.action))throw Error('点击行为不正确');checkRanges(node.rankStyles||[]);walk(node.children||[],depth+1);walk(node.productNodes||[],depth+1);});};
  for(const section of ['header','card','footer','empty']){if(!scene[section]||!Number.isFinite(scene[section].height)||scene[section].height<0||scene[section].height>3000)throw Error('区块高度不正确');walk(scene[section].nodes,0);}
  if(!Array.isArray(scene.tabs)||scene.tabs.length>8)throw Error('最多配置8个榜单标签');
  const boards=new Set();scene.tabs.forEach((tab,index)=>{if(typeof tab.label!=='string'||!tab.label.trim()||!Number.isInteger(tab.rankingId)||tab.rankingId<(index?1:0)||boards.has(tab.rankingId))throw Error('标签需绑定不同的有效榜单');boards.add(tab.rankingId);});checkRanges(scene.card.heights||[]);
  return scene;
}
function normalizeNode(value) { const node=canvasNode(value.kind,value); node.children=(value.children||[]).map(normalizeNode);node.productNodes=(node.productNodes||[]).map(normalizeNode); return node; }
export function nodeValue(node, context) {
  if (!node.binding) return node.kind === 'image' ? node.image : node.text;
  const value = node.binding.split('.').reduce((data, key) => data == null ? undefined : data[key], context);
  if (value === undefined || value === null || value === '') return '';
  return typeof value === 'number' && node.decimals >= 0 ? value.toFixed(node.decimals) : String(value);
}
export function nodeText(node, context) {
  const value = nodeValue(node, context);
  if (node.binding && value === '' && node.hideWhenEmpty) return '';
  const rank = Number(context.rank || (context.item || {}).rank || 0);
  return (node.prefix + value + node.suffix).replace(/\{rank:02\}/g,String(rank).padStart(2,'0')).replace(/\{rank\}/g,String(rank)).replace(/\{(sales|reviews|price|name)\}/g,(_,key)=>context.item[key]==null?'':String(context.item[key]));
}
export function effectiveCanvasStyle(node, rank) {
  const rule=(node.rankStyles||[]).find(rule=>rank>=rule.from && rank<=rule.to);
  return { ...canvasStyle(), ...node.style, ...(rule ? rule.style : {}) };
}
export function canvasNodeStyle(style, fontFamily, imageUrl = url => url) {
  const result = { position:'absolute', boxSizing:'border-box', left:style.x+'px', top:style.y+'px', width:style.width+'px', height:style.height+'px',
    zIndex:style.zIndex, opacity:style.opacity, transform:style.rotate ? `rotate(${style.rotate}deg)` : 'none', transformOrigin:'center',
    filter:style.grayscale||style.sepia||style.hueRotate||style.saturation!==1||style.brightness!==1?`grayscale(${style.grayscale}) sepia(${style.sepia}) hue-rotate(${style.hueRotate}deg) saturate(${style.saturation}) brightness(${style.brightness})`:'none',
    backgroundColor:style.background, border:`${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
    borderRadius:`${style.radiusTL}px ${style.radiusTR}px ${style.radiusBR}px ${style.radiusBL}px`, overflow:style.overflow,
    boxShadow:style.shadow?`${style.shadowX}px ${style.shadowY}px ${style.shadowBlur}px ${style.shadowColor}`:'none',
    color:style.color,fontSize:style.fontSize+'px',fontWeight:style.fontWeight,fontFamily:style.fontFamily||fontFamily,fontStyle:style.fontStyle,textDecoration:style.textDecoration,lineHeight:String(style.lineHeight),letterSpacing:style.letterSpacing+'px',
    textAlign:style.textAlign,padding:`${style.paddingY}px ${style.paddingX}px`,
    textShadow:style.textShadow?`${style.textShadowX}px ${style.textShadowY}px ${style.textShadowBlur}px ${style.textShadowColor}`:'none',
    display:'flex',flexDirection:'column',justifyContent:{top:'flex-start',center:'center',bottom:'flex-end'}[style.verticalAlign],
  };
  if(style.backgroundMode==='gradient')result.backgroundImage=`linear-gradient(${style.angle}deg,${style.background},${style.background2})`;
  if(style.backgroundMode==='image' && style.backgroundImage) { result.backgroundImage=`url(${JSON.stringify(imageUrl(style.backgroundImage))})`;result.backgroundSize=style.backgroundFit;result.backgroundPosition=style.backgroundPosition;result.backgroundRepeat='no-repeat'; }
  const clips={shield:'polygon(0 0,100% 0,100% 82%,50% 100%,0 82%)',flag:'polygon(0 0,100% 0,100% 86%,0 100%)',slope:'polygon(0 0,100% 0,100% 100%,9% 100%)'};
  if(clips[style.clip])result.clipPath=clips[style.clip];
  return result;
}
export function canvasFrames(scene, rows, limit, message) {
  const frames=[];
  if(scene.header.height)frames.push({key:'header',section:'header',height:scene.header.height,nodes:scene.header.nodes,item:null});
  const selected=rows.slice(0,limit);
  if(selected.length)selected.forEach((item,index)=>{const rule=scene.card.heights.find(rule=>item.rank>=rule.from&&item.rank<=rule.to);frames.push({key:'card_'+item.id,section:'card',height:rule?rule.height:scene.card.height,gap:index===selected.length-1?0:scene.card.gap,nodes:scene.card.nodes,item});});
  else frames.push({key:'empty',section:'empty',height:scene.empty.height,nodes:scene.empty.nodes,item:null,message});
  if(scene.footer.height)frames.push({key:'footer',section:'footer',height:scene.footer.height,nodes:scene.footer.nodes,item:null});
  return frames;
}
const make=(id,kind,x,y,width,height,extra={})=>canvasNode(kind,{id,label:id,...extra,style:{x,y,width,height,...(extra.style||{})}});
const text=(id,x,y,w,h,binding,value,style={})=>make(id,'text',x,y,w,h,{binding,text:value||'',style});
const colors=['#f4ddae','#d5ddea','#efd0ba'];
export function canvasPreset(type='tmall_product') {
  const scene=canvasDefaults();scene.enabled=true;
  scene.header.height=200;scene.card.height=201;scene.card.gap=10;
  scene.header.nodes=[
    make('榜头背景','group',0,0,375,160,{style:{background:'#28211d',background2:'#0f0e0d',backgroundMode:'gradient',angle:115}}),
    make('榜头装饰素材','image',55,10,265,115,{image:'/statics/ranking/gold-arch.svg',hideWhenEmpty:true,style:{fit:'contain'}}),
    text('榜头品牌文字',50,24,275,22,'','精选榜单',{textAlign:'center',fontSize:13,color:'#ead4ad'}),
    text('榜头主标题',24,58,327,40,'ranking.name','',{textAlign:'center',fontSize:25,fontWeight:600,color:'#ffefda',lineHeight:1.2}),
    text('榜头说明',18,113,339,32,'ranking.description','',{textAlign:'center',fontSize:11,color:'#d5bea3',lines:2}),
    make('榜头金色底线','group',0,157,375,2,{style:{background:'#715540',background2:'#e9c996',backgroundMode:'gradient'}}),
    make('返回按钮','button',8,20,30,30,{text:'‹',action:'back',style:{fontSize:28,color:'#f3eadc',verticalAlign:'center',textAlign:'center'}}),
    make('规则按钮','button',326,68,43,22,{text:'规则',action:'rules',style:{fontSize:11,color:'#e8d7be',borderWidth:1,borderColor:'#8d7358',radiusTL:11,radiusTR:11,radiusBL:11,radiusBR:11,verticalAlign:'center',textAlign:'center'}}),
    make('榜单切换','tabs',0,160,375,40,{style:{color:'#dddddd',activeColor:'#f0d39b',fontSize:14,verticalAlign:'center',indicatorWidth:17,indicatorHeight:3}}),
  ];
  scene.tabs=[{label:'热销榜',rankingId:0}];
  scene.empty.nodes=[text('空状态',20,20,335,40,'state.message','',{color:'#bbbbbb',fontSize:14,textAlign:'center'})];
  if(type==='tmall_shop') {
    scene.header.height=162;scene.header.nodes=scene.header.nodes.filter(n=>n.kind!=='tabs');scene.card.height=232;
    scene.card.nodes=[
      make('店铺卡片','group',0,0,375,232,{style:{background:'#fff8eb',background2:'#f1dfc6',backgroundMode:'gradient',angle:110,radiusTL:8,radiusTR:8,radiusBL:8,radiusBR:8},rankStyles:[{from:2,to:2,style:{background:'#f2f3f9',background2:'#cbd3e4'}},{from:3,to:3,style:{background:'#fff3ef',background2:'#ead2c3'}}]}),
      text('店铺水印',152,10,210,45,'item.name','',{fontSize:38,fontWeight:700,color:'#a99a87',opacity:0.1,lines:1}),
      make('店铺名次','text',14,14,26,31,{text:'{rank}',style:{fontSize:22,fontWeight:700,textAlign:'center',verticalAlign:'center',background:'#f4ddb4',color:'#8d632e',clip:'shield'},rankStyles:[{from:2,to:2,style:{background:'#d6deed',color:'#566a8a'}},{from:3,to:3,style:{background:'#f0cbb5',color:'#ad7550'}}]}),
      text('店铺名称',48,12,313,29,'item.name','',{fontSize:21,fontWeight:700,color:'#222222',lines:1}),
      make('在售商品数','text',48,42,155,22,{binding:'item.product_count',prefix:'在售商品 ',suffix:' 件',style:{fontSize:13,color:'#827866'}}),
      make('评价数量','text',205,42,156,22,{binding:'item.reviews',prefix:'评价 ',suffix:' 条',style:{fontSize:13,color:'#827866'}}),
      make('店铺商品组','products',14,78,347,143,{count:3,productCaption:'销量 {sales}',style:{columns:3,gap:10,imageHeight:106,productRadius:7,priceSize:15,productTextSize:12,productCaptionBackground:'#fff4d7',productTextColor:'#867344'}}),
    ];
  } else if(type==='dianping_shop') {
    scene.background='#f5f5f5';scene.header.height=200;scene.card.height=139;
    scene.header.nodes=scene.header.nodes.map(n=>n.id==='榜头主标题'?{...n,style:{...n.style,fontSize:24}}:n);
    scene.header.nodes.find(n=>n.id==='榜头装饰素材').image='/statics/ranking/laurel.svg';
    scene.header.nodes.find(n=>n.kind==='tabs').style={...scene.header.nodes.find(n=>n.kind==='tabs').style,color:'#555555',activeColor:'#ff773d',indicatorColor:'#ff773d'};
    scene.card.nodes=[
      make('点评店铺卡片','group',8,0,359,139,{style:{background:'#ffffff',radiusTL:12,radiusTR:12,radiusBL:12,radiusBR:12}}),
      make('店铺实物图','image',20,13,83,93,{binding:'item.image',style:{radiusTL:4,radiusTR:4,radiusBL:4,radiusBR:4,fit:'cover'}}),
      make('TOP竖标','text',19,6,27,41,{text:'TOP\n{rank:02}',style:{background:'#ff7b3b',color:'#ffffff',fontSize:13,fontWeight:700,lineHeight:1.15,textAlign:'center',verticalAlign:'center',clip:'flag'},rankStyles:[{from:4,to:100,style:{background:'#737373'}}]}),
      text('店铺名称',113,13,239,27,'item.name','',{fontSize:16,fontWeight:700,lines:1}),
      make('星级评分','stars',113,46,98,18,{binding:'item.rating_score',style:{fontSize:13,color:'#ff7339'}}),
      make('评分数值','text',215,43,65,22,{binding:'item.rating_score',decimals:1,suffix:' 分',style:{fontSize:13,color:'#ff7339'}}),
      text('店铺类型',113,73,239,20,'item.type_name','',{fontSize:12,color:'#999999'}),
      make('店铺评价数','text',113,99,117,20,{binding:'item.reviews',suffix:' 条评价',style:{fontSize:12,color:'#999999'}}),
      make('店铺在售商品数','text',234,99,118,20,{binding:'item.product_count',suffix:' 件商品',style:{fontSize:12,color:'#999999'}}),
    ];
  } else {
    scene.card.nodes=[
      make('商品卡片背景','group',0,0,375,201,{style:{background:'#785756',background2:'#a48e80',backgroundMode:'gradient',angle:140,radiusTL:10,radiusTR:10,radiusBL:10,radiusBR:10},rankStyles:[{from:2,to:2,style:{background:'#626879',background2:'#a0a8b8'}},{from:3,to:3,style:{background:'#755251',background2:'#b79681'}}]}),
      make('右侧白底内容','group',139,24,236,138,{style:{background:'#ffffff',radiusTL:14,radiusTR:12}}),
      make('实物商品图','image',0,0,143,162,{binding:'item.image',style:{radiusTL:10,radiusBL:5,fit:'cover'}}),
      make('TOP奖牌','text',4,0,29,38,{text:'TOP\n{rank}',style:{background:'#f3dbab',color:'#966a35',fontSize:13,fontWeight:700,textAlign:'center',verticalAlign:'center',lineHeight:1.15,borderWidth:1,borderColor:'#efd9aa',clip:'shield'},rankStyles:[{from:2,to:2,style:{background:'#d9e0eb',color:'#61728b',borderColor:'#b7c7db'}},{from:3,to:3,style:{background:'#ebc7ac',color:'#ad744c',borderColor:'#f0d7bd'}}]}),
      make('指数顶条','text',229,2,138,21,{binding:'item.score',prefix:'综合指数 ',decimals:1,style:{fontSize:12,fontWeight:700,color:'#fff6ef',textAlign:'center'}}),
      text('商品名称',160,40,202,42,'item.name','',{fontSize:14,color:'#4a3b2b',lines:2}),
      make('商品成交量','text',160,87,202,22,{binding:'item.sales',prefix:'{period}售出 ',suffix:' 件',style:{fontSize:12,color:'#66523b'}}),
      text('公开评价摘要',160,113,202,38,'item.review_excerpt','',{fontSize:12,color:'#66523b',lines:2}),
      make('价格','text',10,170,117,24,{binding:'item.price',prefix:'¥ ',style:{fontSize:19,color:'#ffffff',verticalAlign:'center'}}),
      make('服务标签','text',129,172,147,21,{text:'',hideWhenEmpty:true,style:{fontSize:10,color:'#f8f0e8'}}),
      make('购买按钮','button',297,171,67,23,{text:'去购买',action:'product',style:{fontSize:12,color:'#72502b',textAlign:'center',verticalAlign:'center',background:'#f1d3ac',radiusTL:14,radiusTR:14,radiusBL:14,radiusBR:14}}),
    ];
  }
  return type==='tmall_product'||type==='tmall_shop' ? applyTmallAssets(scene,type) : scene;
}
function applyTmallAssets(scene,type) {
  const dir='/statics/ranking/tmall-v2/', shop=type==='tmall_shop';
  scene.fonts=[{family:'RankBrush',url:dir+'fonts/MaShanZheng-Regular.woff2'},{family:'RankNumber',url:dir+'fonts/BarlowCondensed-SemiBold.woff2'}];
  scene.background='#111111';
  scene.header.height=shop?144:203;
  const header=id=>scene.header.nodes.find(node=>node.id===id);
  Object.assign(header('榜头背景').style,{height:shop?144:164,background:'#111111',backgroundMode:'image',backgroundImage:dir+'header-atmosphere.png',backgroundFit:'cover'});
  scene.header.nodes.splice(1,0,make('榜头暗色蒙层','group',0,0,375,shop?144:164,{style:{background:'#080707',opacity:0.42}}));
  header('榜头装饰素材').image=dir+'header-metal.png';
  Object.assign(header('榜头装饰素材').style,{x:shop?98:80,y:shop?2:16,width:shop?179:215,height:shop?77:100,fit:'fill'});
  header('榜头品牌文字').text='商城榜单';
  Object.assign(header('榜头品牌文字').style,{x:120,y:shop?12:27,width:135,height:18,color:'#ffffff',fontSize:12});
  Object.assign(header('榜头主标题').style,{x:24,y:shop?53:73,width:327,height:40,fontFamily:shop?'':'RankBrush',fontSize:shop?25:28,fontWeight:shop?700:400,color:shop?'#e5d2b8':'#fff6e8',lineHeight:1.2});
  Object.assign(header('榜头说明').style,{x:18,y:shop?105:120,width:339,height:26,fontSize:11,color:'#e7d6bd',lineHeight:1.2});
  const curve=header('榜头金色底线');curve.kind='image';curve.image=dir+'header-curve.svg';Object.assign(curve.style,{x:0,y:shop?125:144,width:375,height:shop?19:25,background:'transparent',backgroundMode:'solid',fit:'fill'});
  Object.assign(header('返回按钮').style,{x:9,y:15,width:26,height:26,color:'#e9e4dc',fontSize:27,background:'rgba(0,0,0,0.16)',radiusTL:13,radiusTR:13,radiusBL:13,radiusBR:13});
  Object.assign(header('规则按钮').style,{x:332,y:shop?72:77,width:35,height:20,fontSize:11,borderColor:'#81705f',color:'#e7d8c6'});
  scene.header.nodes.push(make('更多按钮','button',332,shop?95:101,35,20,{text:'更多',action:'ranking',style:{color:'#e7d8c6',fontSize:11,textAlign:'center',verticalAlign:'center',borderWidth:1,borderColor:'#81705f',radiusTL:10,radiusTR:10,radiusBL:10,radiusBR:10}}));
  const tabs=scene.header.nodes.find(node=>node.kind==='tabs');
  if(tabs)Object.assign(tabs.style,{x:0,y:169,width:375,height:34,fontSize:13,color:'#f7f0e4',activeColor:'#f5d7a0',indicatorColor:'#e4c187',indicatorWidth:15,indicatorHeight:3});
  const medalStyle=[{from:2,to:2,style:{grayscale:1,sepia:0.18,hueRotate:165,saturation:0.7,brightness:1.04}},{from:3,to:3,style:{sepia:0,hueRotate:-35,saturation:3,brightness:0.85}},{from:4,to:100,style:{grayscale:1,brightness:0.85}}];
  const rankColors=[{from:2,to:2,style:{color:'#59677e'}},{from:3,to:3,style:{color:'#873f25'}},{from:4,to:100,style:{color:'#666666'}}];
  if(shop) {
    scene.card.height=220;scene.card.gap=9;
    const item=id=>scene.card.nodes.find(node=>node.id===id);
    Object.assign(item('店铺卡片').style,{height:220,background:'#fcf4e8',background2:'#efdfc8',angle:112});
    item('店铺卡片').rankStyles=[{from:2,to:2,style:{background:'#f4f3f8',background2:'#cbd4e7'}},{from:3,to:3,style:{background:'#fcf0e9',background2:'#eac9b6'}}];
    Object.assign(item('店铺水印').style,{x:150,y:8,width:215,height:56,fontSize:43,opacity:0.065,color:'#a4917a'});
    const rank=item('店铺名次');Object.assign(rank.style,{x:15,y:12,width:25,height:32,fontFamily:'RankNumber',fontSize:25,fontWeight:400,background:'transparent',clip:'none',color:'#8f6b37'});rank.rankStyles=rankColors;
    const rankImage=make('店铺名次奖牌','image',12,10,31,38,{image:dir+'gold-medal-final.png',style:{fit:'fill',opacity:0.9},rankStyles:medalStyle});
    scene.card.nodes.splice(scene.card.nodes.indexOf(rank),0,rankImage);
    Object.assign(item('店铺名称').style,{x:46,y:12,width:315,height:28,fontSize:21,fontWeight:700,color:'#222222'});
    Object.assign(item('在售商品数').style,{x:46,y:43,width:160,height:20,fontSize:13,color:'#8e8272'});
    Object.assign(item('评价数量').style,{x:208,y:43,width:150,height:20,fontSize:13,color:'#8e8272'});
    const group=item('店铺商品组');Object.assign(group.style,{x:14,y:74,width:347,height:137,productItemHeight:137});
    const price=group.productNodes.find(node=>node.binding==='item.price');Object.assign(price.style,{y:111,fontSize:16,color:'#222222',fontWeight:600});
    return scene;
  }
  scene.card.height=198;scene.card.gap=9;
  const node=id=>scene.card.nodes.find(n=>n.id===id);
  Object.assign(node('商品卡片背景').style,{height:198,background:'#46313a',background2:'#765345',angle:133});
  node('商品卡片背景').rankStyles=[{from:2,to:2,style:{background:'#34303d',background2:'#77717e'}},{from:3,to:3,style:{background:'#4d3038',background2:'#876051'}}];
  const white=node('右侧白底内容');white.kind='image';white.image=dir+'card-panel.svg';Object.assign(white.style,{x:0,y:0,width:375,height:156,background:'transparent',radiusTL:0,radiusTR:0,fit:'fill'});
  scene.card.nodes.splice(1,0,make('卡片上沿曲线','image',0,0,375,35,{image:dir+'card-ribbons.svg',style:{fit:'fill'}}));
  Object.assign(node('实物商品图').style,{x:0,y:0,width:144,height:156,fit:'cover',radiusTL:10,radiusBL:7,borderWidth:0});
  const medal=node('TOP奖牌');medal.kind='image';medal.text='';medal.image=dir+'gold-medal-final.png';Object.assign(medal.style,{x:0,y:-2,width:34,height:43,background:'transparent',borderWidth:0,clip:'none',fit:'fill'});medal.rankStyles=medalStyle;
  const medalIndex=scene.card.nodes.indexOf(medal)+1;
  scene.card.nodes.splice(medalIndex,0,make('TOP字样','text',5,3,24,10,{text:'TOP',style:{fontFamily:'RankNumber',fontSize:9,fontWeight:400,color:'#75552f',textAlign:'center'},rankStyles:rankColors}),make('名次数字','text',5,11,24,23,{text:'{rank}',style:{fontFamily:'RankNumber',fontSize:23,fontWeight:400,color:'#906b39',textAlign:'center',lineHeight:1},rankStyles:rankColors}));
  const score=node('指数顶条');score.prefix='热销指数 ';Object.assign(score.style,{x:252,y:2,width:114,height:21,fontSize:12,fontWeight:700,fontStyle:'italic',color:'#fff5eb',textAlign:'center'});
  scene.card.nodes.push(make('指数火焰','image',240,5,10,13,{image:dir+'flame.svg',style:{fit:'contain'}}));
  Object.assign(node('商品名称').style,{x:158,y:41,width:204,height:36,fontSize:14,color:'#4c3c29',lineHeight:1.25});
  scene.card.nodes.push(make('值得买标签','image',157,79,42,14,{image:dir+'worth-buying.svg',style:{fit:'fill'}}));
  Object.assign(node('商品成交量').style,{x:204,y:77,width:161,height:19,fontSize:11,color:'#6d5434',lines:1});
  const quote=node('公开评价摘要');quote.prefix='“';quote.suffix='”';Object.assign(quote.style,{x:157,y:103,width:205,height:21,fontSize:12,color:'#5b4830',lines:1});
  scene.card.nodes.push(make('评价图标','image',157,128,14,14,{image:dir+'review.svg',style:{fit:'contain'}}),make('公开评价数量','text',177,127,185,19,{binding:'item.reviews',prefix:'已有 ',suffix:' 条评价',style:{fontSize:11,color:'#7d6d5c'}}));
  const price=node('价格');price.prefix='¥';Object.assign(price.style,{x:8,y:168,width:92,height:26,fontSize:21,fontWeight:400,color:'#fff6ef'});
  node('服务标签').visible=false;
  scene.card.nodes.push(make('好评数据标签','text',102,172,64,15,{binding:'item.rating',prefix:'好评 ',suffix:'%',decimals:0,style:{fontSize:9,color:'#fff4e6',background:'rgba(255,255,255,0.12)',radiusTL:3,radiusTR:3,radiusBL:3,radiusBR:3,textAlign:'center',verticalAlign:'center'}}));
  const button=node('购买按钮');button.text='去购买 ›';Object.assign(button.style,{x:297,y:170,width:68,height:24,fontSize:12,color:'#6c4d2c',background:'#f4d4a9'});
  button.rankStyles=[{from:2,to:2,style:{background:'#d6dce9',color:'#4b5262'}},{from:3,to:3,style:{background:'#efc1a2',color:'#865537'}}];
  return scene;
}
