# 天猫风格排行榜素材

本组素材已配置到天猫商品榜、店铺榜全元素预设。新建商品榜或店铺榜的关联页面使用对应预设，文字、图片、数据与装饰均为独立图层。

## 已应用的素材

| 文件 | 用途 |
| --- | --- |
| `header-metal.png` | image_gen 生成的透明金属拱框 |
| `header-atmosphere.png` | image_gen 生成的暗棕色散景背景 |
| `gold-medal-final.png` | image_gen 生成的真实透明金色徽章；银色和铜色通过各名次独立的灰度、色相与亮度配置呈现 |
| `card-panel.svg`、`card-ribbons.svg` | 可缩放的白底曲线图文区和上沿层叠丝带 |
| `header-curve.svg` | 榜头底部金色弧线 |
| `flame.svg`、`review.svg`、`worth-buying.svg` | 火焰、评价图标、“值得买”标签 |
| `fonts/MaShanZheng-Regular.woff2` | 标题手写字体 |
| `fonts/BarlowCondensed-SemiBold.woff2` | TOP标识和名次数字字体 |

生成方式：内置 `image_gen`，使用用户提供的天猫截图作为风格参考。实际采用的完整提示词保存在 [generation-prompts.json](generation-prompts.json)。第一版徽章和一次抠底尝试未产生有效透明通道，已弃用；最终徽章重新生成并通过alpha检查。金属拱框和徽章直接复制生成文件，保留其透明通道。

字体来源：[Google Fonts / Ma Shan Zheng](https://github.com/google/fonts/tree/main/ofl/mashanzheng)、[Google Fonts / Barlow Condensed](https://github.com/google/fonts/tree/main/ofl/barlowcondensed)。原始TTF、转换后的WOFF2及OFL许可一并保留。WOFF2转换保留完整字符集，标题可使用动态榜单名称。

所有素材在项目内可直接使用，不依赖对话中的临时文件。排行榜数据仍来自本地营销规则，评价数、好评率和评价摘要使用真实数据；没有填入虚假的买家付款提示或服务承诺。

预览使用商城实物商品图占位，生成素材仅用于榜头、徽章及界面装饰。

铜牌预设使用色相 -35°、饱和度 3、亮度 0.85（不加棕褐滤镜），呈现明显的赤铜边缘，名次数字为 `#873f25`；金牌保留原始香槟金。店铺奖牌不透明度为 0.9。上述参数和商品图边框宽度均可继续在元素样式或名次覆盖中调整。
