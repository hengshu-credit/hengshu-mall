export const themeColorOptions = [
  {value:'var(--view-theme)',label:'主题主色'},
  {value:'var(--view-gradient)',label:'主题渐变色'},
  {value:'var(--view-minorColor)',label:'主题辅助色'},
  {value:'var(--view-minorColorT)',label:'主题浅色'},
  {value:'var(--view-priceColor)',label:'主题价格色'},
];
export const isThemeColor=value=>themeColorOptions.some(option=>option.value===value);
export function editorThemeColors(palette={}) {
  return {'--view-theme':palette.theme||'#e93323','--view-gradient':palette.gradient||'#ff7931',
    '--view-minorColor':palette.minorColor||palette.bntColor||'#fe960f',
    '--view-minorColorT':palette.minorColorT||'rgba(233,51,35,0.1)',
    '--view-priceColor':palette.priceColor||palette.theme||'#e93323'};
}
export const decorationThemeMixin={
  inject:{decorationTheme:{default:()=>()=>({})}},
  computed:{decorationThemeVariables(){return editorThemeColors(this.decorationTheme());}},
};
