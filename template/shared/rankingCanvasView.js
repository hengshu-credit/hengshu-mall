import { normalizeCanvas, canvasFrames, nodeValue, nodeText, effectiveCanvasStyle, canvasNodeStyle } from './rankingCanvas';
const fontAlias=(family,url)=>{let hash=0;for(const ch of family+url)hash=(hash*31+ch.charCodeAt(0))|0;return'RankingCanvas'+(hash>>>0);};
const fontFamily=(family,map)=>family.split(',').map(name=>{const key=name.trim().replace(/^["']|["']$/g,'');return map[key]||name.trim();}).join(',');
// The second pass contains outlines only. Preserve each ancestor's coordinates,
// clipping and product-grid scaling, but paint it above every content layer.
const hasBorders=(node,rank)=>node.visible && (effectiveCanvasStyle(node,rank).borderWidth>0 || [...node.children,...node.productNodes].some(child=>hasBorders(child,rank)));
export function rankingCanvasView(imageUrl) {
  return {
    props: { config:Object, ranking:{type:Object,default:()=>({})}, rows:{type:Array,default:()=>[]}, activeBoardId:Number, loading:Boolean, error:String, editing:Boolean, selectedId:String },
    data() { return { measuredWidth:0, fontError:'', fontsReady:false, fontLoadVersion:0 }; },
    computed: {
      scene() { return normalizeCanvas(this.config.appearance.canvas); },
      ratio() { return (this.measuredWidth || this.scene.designWidth)/this.scene.designWidth; },
      fontResources(){return [...(this.scene.fontUrl?[{family:'default',url:this.scene.fontUrl}]:[]),...(this.scene.fonts||[])].map(font=>({...font,alias:fontAlias(font.family,font.url)}));},
      fontResourceKey(){return this.fontResources.map(font=>font.alias+':'+font.url).join('|');},
      fontMap(){return Object.fromEntries(this.fontResources.map(font=>[font.family,font.alias]));},
      fontName() { return this.scene.fontUrl ? this.fontMap.default : fontFamily(this.scene.fontFamily||'Arial, "Microsoft YaHei", sans-serif',this.fontMap); },
      frameList() { return canvasFrames(this.scene,this.loading||this.error?[]:this.rows,this.config.limit||10,this.loading?'榜单加载中…':this.error||'暂无符合条件的对象'); },
      rootStyle() { return {position:'relative',width:'100%',boxSizing:'border-box',backgroundColor:this.scene.background,backgroundImage:this.scene.backgroundImage?'url('+JSON.stringify(imageUrl(this.scene.backgroundImage))+')':'none',backgroundSize:this.scene.backgroundFit,paddingTop:this.scene.paddingTop*this.ratio+'px',paddingBottom:this.scene.paddingBottom*this.ratio+'px',fontFamily:this.fontName,overflow:'hidden'}; },
    },
    methods: {
      frameBox(frame) { return {position:'relative',width:'100%',height:(frame.height+(frame.gap||0))*this.ratio+'px'}; },
      frameStage(frame) { return {position:'absolute',left:0,top:0,width:this.scene.designWidth+'px',height:frame.height+'px',transform:`scale(${this.ratio})`,transformOrigin:'left top',fontFamily:this.fontName,overflow:'visible'}; },
      nodeContext(frame) { return {item:frame.item||{},ranking:this.ranking,section:frame.section,state:{message:frame.message||''},tabs:this.scene.tabs,primaryBoardId:this.config.rankingId||((this.scene.tabs[0]||{}).rankingId),activeBoardId:this.activeBoardId||this.config.rankingId,fontFamily:this.fontName,fontMap:this.fontMap}; },
    },
  };
}
export function rankingCanvasNodeView(imageUrl) {
  return {
    props:{node:Object,context:Object,editing:Boolean,selectedId:String,bordersOnly:Boolean},
    computed:{
      s(){return effectiveCanvasStyle(this.node,Number(this.context.rank||this.context.item.rank||0));},
      css(){const css=canvasNodeStyle({...this.s,fontFamily:this.s.fontFamily?fontFamily(this.s.fontFamily,this.context.fontMap||{}):''},this.context.fontFamily,imageUrl);css.borderColor='transparent';if(this.bordersOnly)Object.assign(css,{backgroundColor:'transparent',backgroundImage:'none',boxShadow:'none',pointerEvents:'none',overflow:'visible'});return css;},
      borderCss(){return {position:'absolute',boxSizing:'border-box',left:-this.s.borderWidth+'px',top:-this.s.borderWidth+'px',width:this.s.width+'px',height:this.s.height+'px',border:`${this.s.borderWidth}px ${this.s.borderStyle} ${this.s.borderColor}`,borderRadius:this.css.borderRadius,zIndex:1000,pointerEvents:'none'};},
      borderClipCss(){return {...this.css,left:-this.s.borderWidth+'px',top:-this.s.borderWidth+'px',transform:'none',filter:'none',opacity:1,overflow:this.s.overflow,zIndex:0};},
      sourceNode(){const rank=Number(this.context.rank||this.context.item.rank||0),rule=(this.node.rankStyles||[]).find(rule=>rank>=rule.from&&rank<=rule.to);if(!rule)return this.node;return {...this.node,...(Object.prototype.hasOwnProperty.call(rule,'image')?{binding:'',image:rule.image}:{}),...(Object.prototype.hasOwnProperty.call(rule,'text')?{binding:'',text:rule.text}:{})};},
      value(){return nodeValue(this.sourceNode,this.context);},
      text(){const days=Number(this.context.ranking.window_days||0);return nodeText(this.sourceNode,this.context).replace(/\{days\}/g,String(days)).replace(/\{period\}/g,days?'近'+days+'天':'累计');},
      shown(){return this.node.visible && (!this.bordersOnly || hasBorders(this.node,Number(this.context.rank||this.context.item.rank||0))) && (this.editing || !this.node.hideWhenEmpty || !['text','image','stars'].includes(this.node.kind) || (this.node.kind==='text'?this.text:this.value)!=='');},
      products(){return (this.context.item.products||[]).slice(0,this.node.count);},
      tabItems(){return this.context.tabs||[];},
      textStyle(){return {display:'-webkit-box',WebkitBoxOrient:'vertical',WebkitLineClamp:String(this.s.lines),overflow:'hidden',whiteSpace:'pre-wrap',width:'100%',lineHeight:String(this.s.lineHeight)};},
      starsWidth(){return Math.max(0,Math.min(100,Number(this.value||0)*20))+'%';},
    },
    methods:{
      imageUrl,
      click(){if(this.editing)this.$emit('select',{id:this.node.id,section:this.context.section,rank:this.context.rank||this.context.item.rank});else if(this.node.action!=='none')this.$emit('action',{action:this.node.action,link:this.node.link,item:this.context.item});},
      selectTab(tab,index){if(this.editing)return this.click();const id=Number(tab.rankingId|| (index===0?this.context.primaryBoardId:0));if(id>0)this.$emit('action',{action:'tab',rankingId:id});},
      tabActive(tab,index){return Number(tab.rankingId|| (index===0?this.context.primaryBoardId:0))===Number(this.context.activeBoardId);},
      tabStyle(tab,index){return {position:'relative',flex:1,border:0,backgroundColor:this.tabActive(tab,index)?this.s.activeBackground:'transparent',color:this.tabActive(tab,index)?this.s.activeColor:this.s.color,font:'inherit',padding:0,margin:0,display:'flex',alignItems:'center',justifyContent:'center'};},
      indicator(){return {position:'absolute',bottom:'2px',left:'50%',transform:'translateX(-50%)',width:this.s.indicatorWidth+'px',height:this.s.indicatorHeight+'px',borderRadius:'3px',backgroundColor:this.s.indicatorColor};},
      productsStyle(){return {display:'grid',gridTemplateColumns:`repeat(${this.s.columns},minmax(0,1fr))`,gap:this.s.gap+'px',width:'100%',height:'100%'};},
      productRatio(){return (this.s.width-this.s.paddingX*2-this.s.borderWidth*2-this.s.gap*(this.s.columns-1))/this.s.columns/this.s.productDesignWidth;},
      productFrame(){return {position:'relative',height:this.s.productItemHeight*this.productRatio()+'px'};},
      productStage(){return {position:'absolute',left:0,top:0,width:this.s.productDesignWidth+'px',height:this.s.productItemHeight+'px',transform:`scale(${this.productRatio()})`,transformOrigin:'left top'};},
      productContext(product){return {...this.context,owner:this.context.item,item:product,rank:this.context.rank||this.context.item.rank};},
      caption(product){return this.node.productCaption.replace(/\{(sales|reviews|rating|name|price)\}/g,(_,key)=>product[key]==null?'':String(product[key]));},
      productOpen(product){if(this.editing)this.click();else if(this.node.action!=='none')this.$emit('action',{action:this.node.action,link:this.node.link,item:product});},
    },
  };
}
