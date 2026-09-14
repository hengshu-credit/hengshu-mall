// +----------------------------------------------------------------------
// | CRMEB [ CRMEB赋能开发者，助力企业发展 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2016~2023 https://www.crmeb.com All rights reserved.
// +----------------------------------------------------------------------
// | Licensed CRMEB并不是自由软件，未经许可不能去掉CRMEB相关版权
// +----------------------------------------------------------------------
// | Author: CRMEB Team <admin@crmeb.com>
// +----------------------------------------------------------------------
import { fullWidthDescriptionImages } from '../../../shared/productDescription';

export function formatRichText(html, fullWidthImages = false) {
  let newContent = fullWidthImages ? fullWidthDescriptionImages(html) : html.replace(/<img[^>]*>/gi, function (match, capture) {
    match = match.replace(/style="[^"]+"/gi, '').replace(/style='[^']+'/gi, '');
    match = match.replace(/width="[^"]+"/gi, '').replace(/width='[^']+'/gi, '');
    match = match.replace(/height="[^"]+"/gi, '').replace(/height='[^']+'/gi, '');
    return match;
  });
  newContent = newContent.replace(/style="[^"]+"/gi, function (match, capture) {
    match = match.replace(/(^style="|;)\s*(?:max-)?width\s*:[^;"]+;?/gi, '$1max-width:100%;');
    return match;
  });

  if (fullWidthImages) return fullWidthDescriptionImages(newContent);

  // 如果需要移除换行请打开
  // newContent = newContent.replace(/<br[^>]*\/>/gi, '');
  newContent = newContent.replace(
    /\<img/gi,
    '<img style="max-width:100%;height:auto;display:block;margin-top:0;margin-bottom:0;"',
  );
  return newContent;
}
