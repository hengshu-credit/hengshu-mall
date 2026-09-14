import { commonStyleDefaults } from './componentStyle';

export function productTabsMargin(config = {}) {
  if (config.marginConfig) return config.marginConfig;
  return {
    title: '外边距', val: 0, min: 0, isAll: true,
    valList: [{val:config.mbConfig ? Number(config.mbConfig.val)||0 : 10},{val:10},{val:10},{val:10}],
  };
}

export function productTabsCard(config = {}) {
  const defaults=commonStyleDefaults();
  const result={...config};
  const sides=value=>[0,1,2,3].map(i=>Number(value && (value.isAll ? (value.valList||[])[i]?.val : value.val))||0);
  const legacy=!Number(config.cardStyleVersion);
  const margin=sides(config.marginConfig);
  result.marginConfig=productTabsMargin(config);
  if(legacy && config.marginConfig && (margin.every(n=>n===0) || margin[0]===0&&margin[2]===0&&margin[1]===10&&margin[3]===10))result.marginConfig={...defaults.marginConfig,val:10};
  result.paddingConfig=config.paddingConfig || {...defaults.paddingConfig,val:12};
  if(legacy && sides(result.paddingConfig).every(n=>n===0))result.paddingConfig={...result.paddingConfig,isAll:false,val:12};
  const fillet=config.fillet;
  const flat=!fillet || (Number(fillet.type)===1 ? (fillet.valList||[]).every(v=>!Number(v.val)) : !Number(fillet.val));
  result.fillet=legacy&&flat ? {...defaults.fillet,val:12} : fillet || {...defaults.fillet,val:12};
  result.componentBgConfig=config.componentBgConfig || defaults.componentBgConfig;
  result.cardStyleVersion=1;
  return result;
}
