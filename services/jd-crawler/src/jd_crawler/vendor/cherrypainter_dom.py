# -*- coding: utf-8 -*-
"""Vendored DOM-only extraction helpers from CherryPainter/jd-product-crawler.

Only these three upstream methods are included. The upstream run() and SKU builder
are deliberately absent because they fabricate commerce data.
"""

import json
import time


class UpstreamDomExtractors:
    def _extract_all_by_js(self):
        """
        通过 run_js 在浏览器中执行JS，一次性提取所有DOM数据

        返回:
            dict: 包含 title, price, brand, gallery(多尺寸), attributes, shop, skus 等字段
        """
        js_script = r"""
// 清理URL中的反引号
function cleanUrl(url) {
    if (!url) return '';
    return url.replace(/`/g, '').trim();
}

var result = {
    title: '',
    price: '',
    original_price: '',
    brand: '',
    shop_name: '',
    category_id: 0,  // 3级分类ID
    gallery: [],
    attributes: [],
    sku_options: [],
    detail_image_count: 0,
    raw_param_text: ''
};

// ===== 1. 提取标题 =====
// 优先从页面DOM中提取（避免document.title包含多余后缀如【行情 报价 价格 评测】）
// 标题特征：包含商品关键词，长度10-100字符，不包含"计算器"等工具类词汇
function isValidTitle(text) {
    if (!text) return false;
    text = text.trim();
    // 长度检查
    if (text.length < 10 || text.length > 100) return false;
    // 排除明显的非标题内容
    if (/计算器|工具|脚本|插件|广告|推荐|热门/.test(text)) return false;
    // 标题应该包含商品特征（数字、单位、品牌等）
    if (!/[\d%ml克瓶箱]/.test(text)) return false;
    return true;
}

// 策略1：查找所有h1标签，选择符合标题特征的
var h1Els = document.querySelectorAll('h1');
for (var hi = 0; hi < h1Els.length; hi++) {
    var h1Text = h1Els[hi].textContent.trim();
    if (isValidTitle(h1Text)) {
        result.title = h1Text;
        break;
    }
}

// 策略2：使用京东特定的商品名称选择器
if (!result.title) {
    var jdTitleSelectors = [
        '.sku-name',  // 京东商品页常用
        '.itemInfo-wrap .name',  // 商品信息区名称
        '#name h1',  // 商品名称h1
        '.product-intro .name'  // 商品介绍区名称
    ];
    for (var ti = 0; ti < jdTitleSelectors.length; ti++) {
        var titleEl = document.querySelector(jdTitleSelectors[ti]);
        if (titleEl && isValidTitle(titleEl.textContent)) {
            result.title = titleEl.textContent.trim();
            break;
        }
    }
}

// 策略3：从document.title中提取（去除多余后缀）
if (!result.title) {
    var docTitle = (document.title || '').replace(/\s*[-_|—].*$/, '').trim();
    if (isValidTitle(docTitle)) {
        result.title = docTitle;
    }
}

// 清理标题中的多余后缀
if (result.title) {
    result.title = result.title.replace(/【行情.*$/, '').trim();
}

// ===== 1.5 提取分类ID（3级分类）=====
// 京东商品页分类ID通常在面包屑导航或页面URL中
// 策略1：从面包屑导航提取第3级分类
var breadcrumbEls = document.querySelectorAll('.breadcrumb a, .crumb a, [class*="breadcrumb"] a, [class*="crumb"] a');
if (breadcrumbEls.length >= 3) {
    // 取第3个（索引2）作为3级分类
    var thirdCatEl = breadcrumbEls[2];
    var catHref = thirdCatEl.getAttribute('href') || '';
    var catMatch = catHref.match(/cat[=,](\d+)/);
    if (catMatch) {
        result.category_id = parseInt(catMatch[1]);
    }
}
// 策略2：从页面URL参数提取
if (!result.category_id) {
    var urlParams = new URLSearchParams(window.location.search);
    var catIdFromUrl = urlParams.get('cat') || urlParams.get('category');
    if (catIdFromUrl) {
        result.category_id = parseInt(catIdFromUrl);
    }
}
// 策略3：从页面源码中的变量提取（京东通常在页面中嵌入cat参数）
if (!result.category_id) {
    var pageHtml = document.documentElement.innerHTML;
    var catIdMatch = pageHtml.match(/"cat":\s*"?(\d+)"?/);
    if (catIdMatch) {
        result.category_id = parseInt(catIdMatch[1]);
    }
}

// ===== 2. 提取价格 =====
var currentPrice = '';
var allEls = document.querySelectorAll('*');
for (var i = 0; i < allEls.length; i++) {
    var directText = '';
    for (var j = 0; j < allEls[i].childNodes.length; j++) {
        if (allEls[i].childNodes[j].nodeType === 3) directText += allEls[i].childNodes[j].textContent;
    }
    directText = directText.trim();
    var match = directText.match(/^[¥￥]\s*([\d.]+)$/);
    if (match && parseFloat(match[1]) > 0) { currentPrice = match[1]; break; }
}
if (!currentPrice) {
    for (var i = 0; i < allEls.length; i++) {
        var text = allEls[i].textContent.trim();
        var m = text.match(/[¥￥]\s*([\d.]+)/);
        if (m && text.length < 20 && parseFloat(m[1]) > 0) { currentPrice = m[1]; break; }
    }
}
result.price = currentPrice;

// ===== 3. 提取品牌和参数 =====
// 注：allEls已在前面定义
result.attributes = [];
var paramText = '';

// 点击"店铺"标签以加载参数区域（使用多种选择器兼容）
var shopTab = null;
var tabSelectors = [
    '.left-tabs-title li', '.left-tabs-title [class*="tab"]',
    '[class*="tab-title"] li', '[class*="tab-title"] [class*="item"]'
];
for (var si = 0; si < tabSelectors.length && !shopTab; si++) {
    var tabs = document.querySelectorAll(tabSelectors[si]);
    for (var ti = 0; ti < tabs.length; ti++) {
        if (tabs[ti].textContent.trim() === '店铺' && tabs[ti].tagName !== 'A') {
            shopTab = tabs[ti];
            break;
        }
    }
}
// 兜底：遍历所有元素查找
if (!shopTab) {
    for (var i = 0; i < allEls.length; i++) {
        var text = allEls[i].textContent || '';
        if (text.trim() === '店铺' && allEls[i].tagName !== 'A') {
            shopTab = allEls[i];
            break;
        }
    }
}
if (shopTab) {
    shopTab.click();
}

// ===== 策略1（优先）：从规整参数区域提取 =====
// DOM结构（双栏参数表）：
//   div.item 内部有两个子元素：标签和值
//   例如：<div class="item"><span>品牌</span><span>华硕（ASUS）</span></div>
//   或者：<div class="item">品牌华硕（ASUS）</div>（纯文本形式）
var itemParams = [];

// 尝试多个选择器找到参数容器
var containerSelectors = [
    '.attribute .list',       // 主图下方的参数列表
    '.left-tabs-item .attrs', // 店铺标签页下的完整参数列表
    '.attrs'                  // 通用兜底
];

for (var cs = 0; cs < containerSelectors.length; cs++) {
    var containers = document.querySelectorAll(containerSelectors[cs]);
    for (var ci = 0; ci < containers.length; ci++) {
        var container = containers[ci];
        var items = container.querySelectorAll('.item');
        if (items.length < 1) continue;

        for (var it = 0; it < items.length; it++) {
            var item = items[it];
            var itemText = (item.textContent || '').trim();
            if (!itemText || itemText.length < 2) continue;

            // 方法1：精确选择器（根据用户提供的HTML结构）
            // <div class="item">
            //   <div class="label"><span class="text"> 品牌</span></div>
            //   <div class="value"><div class="text" title="华硕（ASUS）">华硕（ASUS）</div></div>
            // </div>
            var pName = '';
            var pValue = '';

            var labelEl = item.querySelector('.label .text');
            var valueEl = item.querySelector('.value .text');

            if (labelEl && valueEl) {
                pName = (labelEl.textContent || '').trim();
                // 优先用title属性，更完整
                pValue = (valueEl.getAttribute('title') || valueEl.textContent || '').trim();
            }

            // 方法2：如果上面没拿到，用子元素方式
            if (!pName || !pValue) {
                var children = item.children;
                if (children.length >= 2) {
                    pName = (children[0].textContent || '').trim();
                    pValue = (children[1].textContent || '').trim();
                }
            }

            // 方法3：用冒号分割
            if (!pName && itemText.indexOf('：') > 0) {
                var colonIdx = itemText.indexOf('：');
                if (colonIdx > 0 && colonIdx <= 10) {
                    pName = itemText.substring(0, colonIdx).trim();
                    pValue = itemText.substring(colonIdx + 1).trim();
                }
            }

            // 过滤无效参数
            if (!pName || !pValue || pValue.length === 0 || pValue.length > 200) continue;
            if (pName === '查看' || pName === '参数' || pName === '详情') continue;

            // 全部保留，不去重（同名参数如"产品净重"可能出现多次，值不同）
            itemParams.push({name: pName, value: pValue});
            // 特殊处理品牌
            if (pName === '品牌') {
                result.brand = pValue;
            }
        }
    }
}

// 如果策略1成功，直接使用
if (itemParams.length >= 2) {
    for (var ip = 0; ip < itemParams.length; ip++) {
        result.attributes.push({group: '基础信息', name: itemParams[ip].name, value: itemParams[ip].value});
    }
}

// ===== 策略2（兜底）：从连续文本中用正则提取 =====
if (itemParams.length < 2) {
    // 查找包含"品牌"+"商品编号"+"保质期"的元素
    for (var i = 0; i < allEls.length; i++) {
        var el = allEls[i];
        var t = (el.textContent || '').trim();
        if (t.indexOf('品牌') > -1 && t.indexOf('商品编号') > -1 && t.indexOf('保质期') > -1 && t.length < 1500) {
            if (t.indexOf('口感') === -1 && t.indexOf('好喝') === -1 && t.indexOf('香气') === -1 && t.indexOf('终于') === -1) {
                paramText = t;
                break;
            }
        }
    }
    if (!paramText) {
        for (var i = 0; i < allEls.length; i++) {
            var el = allEls[i];
            var t = (el.textContent || '').trim();
            if (t.indexOf('品牌') > -1 && t.indexOf('商品编号') > -1 && t.length < 2000) {
                if (t.indexOf('非常') === -1 && t.indexOf('终于') === -1) {
                    paramText = t;
                    break;
                }
            }
        }
    }

    result.raw_param_text = paramText;

    if (paramText) {
        paramText = paramText.replace(/\d{1,2}:\d{2}\s*\/\s*\d{1,2}:\d{2}/g, '');
        paramText = paramText.replace(/\d{1,2}:\d{2}/g, '');
        paramText = paramText.replace(/查看全部参数/g, '');
        paramText = paramText.replace(/\s+/g, ' ').trim();

        var paramPatterns = [
            {name: '品牌', regex: /品牌[：:\s]*([（\(\u3010\[?[^）\)\]】\n]{1,15})/},
            {name: '商品编号', regex: /商品编号[：:\s]*(\d{6,})/},
            {name: '保质期', regex: /保质期[：:\s]*([^\s\n]{1,10}?)(?=(?:产地|品牌|商品编号|包装|系列|规格|$))/},
            {name: '产地', regex: /产地[：:\s]*([^\s\n]{2,15}?)(?=(?:品牌|商品编号|包装|保质期|系列|规格|$))/},
            {name: '包装形式', regex: /包装形式[：:\s]*([^\s\n]{2,12})/},
            {name: '包装清单', regex: /包装清单[：:\s]*([^\s\n]{2,50})/},
            {name: '香型', regex: /香型[：:\s]*([^\s\n]{2,8})/},
            {name: '规格', regex: /规格[：:\s]*([^\s\n]{2,30})/},
            {name: '系列', regex: /系列[：:\s]*([^\s\n]{2,15})/},
            {name: '适用场景', regex: /适用场景[：:\s]*([^\s\n]{2,20})/},
            {name: '度数', regex: /度数[：:\s]*(\d+\s*度)/},
            {name: '容量', regex: /(?:容量|净含量)[：:\s]*(\d+\s*(?:ml|ML|mL|Ml|克|g|G|kg|KG|L|l|升)?)/}
        ];

        var extractedParams = {};

        for (var p = 0; p < paramPatterns.length; p++) {
            var pattern = paramPatterns[p];
            var match = paramText.match(pattern.regex);
            if (match && match[1]) {
                var value = match[1].trim();
                value = value.replace(/^[：:\s]+/, '').replace(/[：:\s]+$/, '').trim();
                if (value && value.length >= 1 && value.length < 50) {
                    var invalidPatterns = ['规格参数', '查看全部', '终于', '非常', '不错', '好喝'];
                    var isInvalid = false;
                    for (var inv = 0; inv < invalidPatterns.length; inv++) {
                        if (value.indexOf(invalidPatterns[inv]) > -1 && value.length > 8) {
                            isInvalid = true;
                            break;
                        }
                    }
                    if (!isInvalid && !extractedParams[pattern.name]) {
                        extractedParams[pattern.name] = value;
                        result.attributes.push({group: '基础信息', name: pattern.name, value: value});
                        if (pattern.name === '品牌') {
                            result.brand = value;
                        }
                    }
                }
            }
        }
    }
}

// ===== 4. 提取轮播图（基于精准DOM结构） =====
// DOM分析结果：
//   缩略图：div.image-carousel-track > div.item > img.image
//   主图：img#spec-img.zoom-img（在div#spec-n1.stage内）
//   容器：div[class*="_gallery_"] 或 div.image-carousel

function genMultiSizeUrls(originalSrc) {
    if (!originalSrc || originalSrc.indexOf('360buyimg') === -1) return null;
    var sizes = [
        {key: 's1440x1440', label: '1440'},
        {key: 's800x800', label: '800'},
        {key: 's228x228', label: '228'}
    ];
    var results = [];
    for (var i = 0; i < sizes.length; i++) {
        var size = sizes[i];
        var newUrl = originalSrc.replace(/\/s\d+x\d+_[^/]+\//, '/' + size.key + '_jfs/');
        newUrl = newUrl.replace(/\/s\d+x\d+\//, '/' + size.key + '/');
        results.push({size: size.label, url: newUrl});
    }
    return results;
}

var galleryImages = [];
var seenGallery = {};

// 策略1：从轮播图缩略图列表提取（最精准）
var carouselTracks = document.querySelectorAll('.image-carousel-track, [class*="image-carousel-track"]');
for (var t = 0; t < carouselTracks.length; t++) {
    var trackItems = carouselTracks[t].querySelectorAll('.item');
    for (var i = 0; i < trackItems.length; i++) {
        var itemImg = trackItems[i].querySelector('img');
        if (!itemImg) continue;
        // 排除播放图标等工具图
        if (itemImg.className && (itemImg.className.indexOf('play') > -1 || itemImg.className.indexOf('icon') > -1)) continue;
        var src = cleanUrl(itemImg.getAttribute('data-origin') || itemImg.getAttribute('data-src') || itemImg.getAttribute('src') || '');
        if (!src || src.indexOf('360buyimg') === -1 || src.indexOf('jfs') === -1) continue;
        if (src.indexOf('shaidan') > -1) continue;
        if (src.indexOf('imagetools') > -1) continue;
        if (src.indexOf('//') === 0) src = 'https:' + src;
        var multiSizes = genMultiSizeUrls(src);
        if (!multiSizes) continue;
        var baseUrl = multiSizes[0].url;
        if (seenGallery[baseUrl]) continue;
        seenGallery[baseUrl] = true;
        galleryImages.push(multiSizes);
    }
    if (galleryImages.length > 0) break;
}

// 策略2：从 _gallery_ 容器中查找
if (galleryImages.length === 0) {
    var galleryContainers = document.querySelectorAll('[class*="_gallery_"]');
    for (var g = 0; g < galleryContainers.length; g++) {
        var imgs = galleryContainers[g].querySelectorAll('img');
        for (var i = 0; i < imgs.length; i++) {
            var src = cleanUrl(imgs[i].getAttribute('data-origin') || imgs[i].getAttribute('data-src') || imgs[i].getAttribute('src') || '');
            if (!src || src.indexOf('360buyimg') === -1 || src.indexOf('jfs') === -1) continue;
            if (src.indexOf('shaidan') > -1 || src.indexOf('imagetools') > -1) continue;
            if (src.indexOf('//') === 0) src = 'https:' + src;
            var multiSizes = genMultiSizeUrls(src);
            if (!multiSizes) continue;
            var baseUrl = multiSizes[0].url;
            if (seenGallery[baseUrl]) continue;
            seenGallery[baseUrl] = true;
            galleryImages.push(multiSizes);
        }
        if (galleryImages.length > 0) break;
    }
}

// 策略3：兜底 - 查找pcpubliccms路径的正方形图片
if (galleryImages.length === 0) {
    var allImgs2 = document.querySelectorAll('img');
    for (var i = 0; i < allImgs2.length; i++) {
        var src = cleanUrl(allImgs2[i].getAttribute('data-origin') || allImgs2[i].getAttribute('data-src') || allImgs2[i].getAttribute('src') || '');
        if (!src || src.indexOf('pcpubliccms') === -1 || src.indexOf('jfs') === -1) continue;
        var sizeMatch = src.match(/\/s(\d+)x(\d+)/);
        if (!sizeMatch) continue;
        var w = parseInt(sizeMatch[1]), h = parseInt(sizeMatch[2]);
        if (w < 228 || h < 228 || Math.abs(w - h) > 100) continue;
        if (src.indexOf('//') === 0) src = 'https:' + src;
        var multiSizes = genMultiSizeUrls(src);
        if (!multiSizes) continue;
        var baseUrl = multiSizes[0].url;
        if (seenGallery[baseUrl]) continue;
        seenGallery[baseUrl] = true;
        galleryImages.push(multiSizes);
    }
}

result.gallery = galleryImages;
result.debug_gallery_count = galleryImages.length;

// ===== 4.5 提取商品视频（合并到轮播图gallery中）=====
// 京东商品视频通常在轮播图区域内，是轮播图的第一个元素
// 将视频作为gallery的第一项插入，而不是单独存储
result.video_url = '';
var videoUrl = '';

// 策略1：查找video标签的src属性
var videoTags = document.querySelectorAll('video');
for (var vi = 0; vi < videoTags.length; vi++) {
    var vSrc = videoTags[vi].getAttribute('src') || videoTags[vi].getAttribute('data-src') || '';
    if (vSrc && vSrc.indexOf('.mp4') > -1) {
        videoUrl = cleanUrl(vSrc);
        break;
    }
    // 检查source子标签
    var sources = videoTags[vi].querySelectorAll('source');
    for (var si = 0; si < sources.length; si++) {
        var sSrc = sources[si].getAttribute('src') || '';
        if (sSrc && sSrc.indexOf('.mp4') > -1) {
            videoUrl = cleanUrl(sSrc);
            break;
        }
    }
    if (videoUrl) break;
}

// 策略2：在轮播图容器中查找视频相关元素
if (!videoUrl) {
    var galleryAreas = document.querySelectorAll('[class*="_gallery_"], .image-carousel, .stage');
    for (var ga = 0; ga < galleryAreas.length; ga++) {
        var area = galleryAreas[ga];
        var areaLinks = area.querySelectorAll('a[href*=".mp4"], a[href*="vod."], a[href*="video"]');
        for (var al = 0; al < areaLinks.length; al++) {
            var aHref = areaLinks[al].getAttribute('href') || '';
            if (aHref && aHref.indexOf('.mp4') > -1) {
                videoUrl = cleanUrl(aHref);
                break;
            }
        }
        if (videoUrl) break;

        var videoDataEls = area.querySelectorAll('[data-video], [data-video-url], [data-url*=".mp4"]');
        for (var vd = 0; vd < videoDataEls.length; vd++) {
            var dvUrl = videoDataEls[vd].getAttribute('data-video') ||
                        videoDataEls[vd].getAttribute('data-video-url') ||
                        videoDataEls[vd].getAttribute('data-url') || '';
            if (dvUrl && dvUrl.indexOf('.mp4') > -1) {
                videoUrl = cleanUrl(dvUrl);
                break;
            }
        }
        if (videoUrl) break;
    }
}

// 策略3：从页面所有元素中搜索视频URL（通用兜底）
if (!videoUrl) {
    var allMediaEls = document.querySelectorAll('[src*=".mp4"], [data-src*=".mp4"], [data-url*=".mp4"], [data-video*=".mp4"]');
    for (var me = 0; me < allMediaEls.length; me++) {
        var mSrc = allMediaEls[me].getAttribute('src') ||
                   allMediaEls[me].getAttribute('data-src') ||
                   allMediaEls[me].getAttribute('data-url') ||
                   allMediaEls[me].getAttribute('data-video') || '';
        if (mSrc && mSrc.indexOf('.mp4') > -1) {
            videoUrl = cleanUrl(mSrc);
            break;
        }
    }
}

// 策略4：从页面源码中正则匹配视频URL（最终兜底）
if (!videoUrl) {
    var pageHtml = document.documentElement.innerHTML;
    var videoMatch = pageHtml.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/);
    if (videoMatch) {
        videoUrl = videoMatch[0];
    }
}

// 补全协议头
if (videoUrl && videoUrl.indexOf('//') === 0) {
    videoUrl = 'https:' + videoUrl;
}

// 将视频作为gallery的第一项插入（视频在轮播图中排在最前面）
if (videoUrl) {
    result.video_url = videoUrl;
    result.gallery.unshift([{"type": "video", "url": videoUrl, "size": "video"}]);
}

// ===== 5. 提取店铺 =====
// 根据用户提供的HTML结构精确定位：
// <div class="base shop-plugin" data-shopid="1000000182">
//   <img class="top-logo" src="...">
//   <div class="top-name" title="华硕京东自营官方旗舰店">华硕京东自营官方旗舰店</div>
// </div>
result.shop_id = '';
result.shop_logo = '';

var shopPlugin = document.querySelector('.shop-plugin');
if (shopPlugin) {
    // 店铺ID
    result.shop_id = shopPlugin.getAttribute('data-shopid') || '';

    // 店铺Logo
    var logoEl = shopPlugin.querySelector('.top-logo');
    if (logoEl) {
        result.shop_logo = logoEl.getAttribute('src') || '';
        if (result.shop_logo.indexOf('//') === 0) result.shop_logo = 'https:' + result.shop_logo;
    }

    // 店铺名（优先用title属性，更完整）
    var nameEl = shopPlugin.querySelector('.top-name');
    if (nameEl) {
        result.shop_name = nameEl.getAttribute('title') || nameEl.textContent.trim() || '';
    }
}

// 兜底：如果上面没找到
if (!result.shop_name) {
    var nameEl2 = document.querySelector('.top-name[title]');
    if (nameEl2) {
        result.shop_name = nameEl2.getAttribute('title') || '';
    }
}

// ===== 6. SKU选项 =====
// 根据用户提供的HTML结构精确定位：
// <div class="page-right-spec">
//   <div class="specification-series-layout"> 系列品 </div>
//   <div class="specifications-panel-content">
//     <div class="specification-group"> 处理器或显卡/存储/屏幕规格 </div>
//   </div>
// </div>
var skuGroups = [];
var seenSku = {};

// 策略1：精确定位 .page-right-spec 容器
var specContainer = document.querySelector('.page-right-spec');
if (specContainer) {
    // 1. 提取"系列品"区域
    var seriesLayout = specContainer.querySelector('.specification-series-layout');
    if (seriesLayout) {
        var seriesLabel = '';
        var labelEl = seriesLayout.querySelector('.layout-label');
        if (labelEl) seriesLabel = labelEl.textContent.trim();

        var seriesOptions = [];
        var seriesItems = seriesLayout.querySelectorAll('.specification-series-item');
        for (var si = 0; si < seriesItems.length; si++) {
            var item = seriesItems[si];
            var textEl = item.querySelector('.specification-series-item-text');
            var optText = textEl ? textEl.textContent.trim() : item.textContent.trim();

            if (!optText || optText.length < 2) continue;

            var isSelected = item.className.indexOf('selected') > -1;

            if (!seenSku[optText]) {
                seenSku[optText] = true;
                seriesOptions.push({
                    name: optText,
                    image: '',
                    disabled: false,
                    selected: isSelected
                });
            }
        }

        if (seriesOptions.length > 0) {
            skuGroups.push({
                label: seriesLabel || '系列品',
                options: seriesOptions
            });
        }
    }

    // 2. 提取其他规格组（处理器或显卡/存储/屏幕规格）
    var specGroups = specContainer.querySelectorAll('.specification-group');
    for (var gi = 0; gi < specGroups.length; gi++) {
        var group = specGroups[gi];

        // 获取分组标签
        var groupLabelEl = group.querySelector('.specification-group-label');
        var groupLabel = groupLabelEl ? groupLabelEl.textContent.trim() : '';

        var groupOptions = [];
        var skuItems = group.querySelectorAll('.specification-item-sku');

        for (var oi = 0; oi < skuItems.length; oi++) {
            var item = skuItems[oi];

            // 获取文本
            var textEl = item.querySelector('.specification-item-sku-text');
            var optText = textEl ? textEl.textContent.trim() : item.textContent.trim();

            if (!optText || optText.length < 2 || optText.length > 100) continue;

            // 获取图片
            var imgEl = item.querySelector('.specification-item-sku-image');
            var imgSrc = '';
            if (imgEl) {
                imgSrc = imgEl.getAttribute('src') || '';
                if (imgSrc.indexOf('//') === 0) imgSrc = 'https:' + imgSrc;
            }

            // 检查选中/禁用状态
            var classStr = item.className || '';
            var isSelected = classStr.indexOf('selected') > -1;
            var isDisabled = classStr.indexOf('disabled') > -1 || /无货|售罄/.test(optText);

            var skuKey = groupLabel ? (groupLabel + ':' + optText) : optText;
            if (!seenSku[skuKey]) {
                seenSku[skuKey] = true;
                groupOptions.push({
                    name: optText,
                    image: imgSrc,
                    disabled: isDisabled,
                    selected: isSelected
                });
            }
        }

        if (groupOptions.length > 0) {
            skuGroups.push({
                label: groupLabel,
                options: groupOptions
            });
        }
    }
}

// 策略2：兜底 - 如果上面没找到，用简单方式提取
if (skuGroups.length === 0) {
    var skuKeywords = ['规格', '系列', '配置', '颜色', '版本', '型号', '尺寸', '容量', '存储'];
    var fallbackOptions = [];
    for (var i = 0; i < allEls.length; i++) {
        var el = allEls[i];
        var text = el.textContent || '';
        var hasKeyword = false;
        for (var kw = 0; kw < skuKeywords.length; kw++) {
            if (text.indexOf(skuKeywords[kw]) > -1) { hasKeyword = true; break; }
        }
        if (hasKeyword && text.length > 5 && text.length < 800) {
            var children = el.querySelectorAll('li, a, span, div, button');
            for (var j = 0; j < children.length; j++) {
                var childText = children[j].textContent.trim();
                if (!childText || childText.length < 2 || childText.length > 50) continue;
                if (/送至|服务|商品|评价|咨询|关注|客服|进店|京东物流/.test(childText)) continue;
                if (/^\d+\.?\d*$/.test(childText)) continue;
                var img = children[j].querySelector('img');
                var imgSrc = '';
                if (img) {
                    imgSrc = cleanUrl(img.getAttribute('src') || img.getAttribute('data-src') || '');
                    if (imgSrc.indexOf('//') === 0) imgSrc = 'https:' + imgSrc;
                }
                if (!seenSku[childText]) {
                    seenSku[childText] = true;
                    fallbackOptions.push({name: childText, image: imgSrc, disabled: false, selected: false});
                }
            }
        }
    }
    if (fallbackOptions.length >= 2) {
        skuGroups.push({label: '', options: fallbackOptions});
    }
}

result.sku_groups = skuGroups;

// ===== 7. 提取服务标签 =====
// <div class="page-right-serviceSupport">
//   <div class="service-support-tag-item">
//     <a/div class="...-text" title="详细说明">服务名</a/div>
//   </div>
// </div>
var services = [];
var serviceContainer = document.querySelector('.page-right-serviceSupport');
if (serviceContainer) {
    var tagItems = serviceContainer.querySelectorAll('.service-support-tag-item');
    for (var sv = 0; sv < tagItems.length; sv++) {
        var tagEl = tagItems[sv];
        // 优先从 a 标签或 .text 元素获取
        var linkEl = tagEl.querySelector('.service-support-tag-item--link');
        var textEl = tagEl.querySelector('.service-support-tag-item--text');
        var targetEl = linkEl || textEl;
        if (targetEl) {
            var svcName = (targetEl.textContent || '').trim();
            var svcDesc = targetEl.getAttribute('title') || '';
            if (svcName) {
                services.push({name: svcName, description: svcDesc});
            }
        }
    }
}
result.services = services;

// ===== 8. 详情图数量 =====
result.detail_image_count = document.querySelectorAll('#detail img, [class*="detail"] img, [class*="Detail"] img').length;

return JSON.stringify(result);
        """

        try:
            raw = self.page.run_js(js_script)
            if raw:
                import json as _json
                data = _json.loads(raw)
                print(f"[提取] 标题: {data.get('title', '')[:50]}...")
                print(f"[提取] 价格: ¥{data.get('price', '未获取')} | 品牌: {data.get('brand', '未获取')} | 轮播图: {len(data.get('gallery', []))} 组")
                return data
        except json.JSONDecodeError as e:
            print(f"[提取] JSON解析失败: {e}")
        except Exception as e:
            print(f"[提取] 执行失败: {e}")
            import traceback
            traceback.print_exc()

        return {}

    def _extract_detail_images_by_js(self):
        """Collect ordered native images and CSS layers in the product description."""
        js_script = r"""
var urls = [], seen = {};
function add(value) {
    if (typeof value !== 'string') return;
    value = value.trim();
    if (!value || !/^(https?:)?\/\//.test(value) || seen[value]) return;
    seen[value] = true;
    urls.push({type: 'image', url: value});
}
function scan(doc) {
    var roots = doc.querySelectorAll('#J-detail-content, #detail, #product-detail, .detail-content, .ssd-module-wrap, .ssd-module');
    var visited = new Set();
    function visit(el) {
        if (visited.has(el)) return;
        visited.add(el);
        if (el.tagName === 'IMG') {
            add(el.getAttribute('data-origin') || el.getAttribute('data-original') ||
                el.getAttribute('data-lazyload') || el.getAttribute('data-src') ||
                el.getAttribute('data-lazy') || el.getAttribute('lazy-img') ||
                el.currentSrc || el.getAttribute('src'));
        }
        add(el.getAttribute('data-background'));
        var bg = doc.defaultView.getComputedStyle(el).backgroundImage || '';
        var match, pattern = /url\(["']?([^"')]+)["']?\)/g;
        while ((match = pattern.exec(bg))) add(match[1]);
        if (el.tagName === 'IFRAME') {
            try { if (el.contentDocument) scan(el.contentDocument); } catch (e) {}
        }
        for (var i = 0; i < el.children.length; i++) visit(el.children[i]);
    }
    for (var i = 0; i < roots.length; i++) visit(roots[i]);
}
scan(document);
return JSON.stringify(urls);
        """
        try:
            raw = self.page.run_js(js_script)
            return json.loads(raw) if raw else []
        except Exception:
            return []

    def _slow_scroll_to_load(self, pause=None, step_ratio=0.75, max_steps=60):
        """慢速平滑滚动到页面底部，逐屏停留触发懒加载。

        京东详情图是 background-image 懒加载：若直接 scrollTo 瞬跳到页尾（"闪现"），
        中间大段区域来不及进入视口而不会加载，background-image 仍是占位符，最终
        提取到 0 张。这里改成"一屏一屏往下挪、每屏停一会儿"，并在每步后重新读取
        页面高度（懒加载会让页面变长），直到真正到底且高度稳定为止。

        Args:
            pause: 每屏停顿秒数（默认取 self.scroll_pause）
            step_ratio: 每步滚动的视口高度比例（0.75=每次滚 3/4 屏，有重叠更稳）
            max_steps: 最大滚动步数上限（防超长页面死循环）
        """
        if pause is None:
            pause = getattr(self, 'scroll_pause', 0.8) or 0.8
        import json as _json
        try:
            last_height = -1
            stable = 0
            for step in range(max_steps):
                raw = self.page.run_js(
                    "return JSON.stringify({"
                    "y: window.pageYOffset || document.documentElement.scrollTop,"
                    "vh: window.innerHeight,"
                    "h: document.body.scrollHeight});"
                )
                try:
                    st = _json.loads(raw) if raw else {}
                except Exception:
                    st = {}
                y = st.get('y', 0) or 0
                vh = st.get('vh', 800) or 800
                h = st.get('h', 0) or 0

                target = int(y + vh * step_ratio)
                # 平滑滚动（配合停顿让 smooth 动画走完，也给懒加载留时间）
                self.page.run_js("window.scrollTo({top: %d, behavior: 'instant'});" % target)
                time.sleep(pause)

                # 到底判定：目标已越过文档底部
                if target + vh >= h:
                    # 高度不再增长（懒加载完成）→ 连续 2 轮稳定即停
                    if h == last_height:
                        stable += 1
                        if stable >= 2:
                            break
                    else:
                        stable = 0
                last_height = h

            # 收尾：滚到最底再停一下，触发最后一屏的懒加载图片
            self.page.run_js("window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});")
            time.sleep(pause + 0.5)
        except Exception as e:
            print(f"[调试] 慢速滚动加载失败（可忽略）: {e}")
