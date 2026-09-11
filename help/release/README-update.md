# 衡枢商城与京东采集：单包更新

此包用于已部署在 `/root/hengshu-mall/crmeb-mall` 的商城。包含 PHP 后端、管理后台与手机 H5 生产文件、Compose 启动配置和独立京东采集容器；不会打包数据库、现有 `.env`、`.constant`、安装锁、上传文件或安装 SQL。服务器不需要 Node.js 或 Python。

需要已安装 Docker 和 Docker Compose。下面使用 `docker-compose` 命令；若服务器使用插件命令，将它替换为 `docker compose`。使用支持 Compose Specification 的当前版本。

## 1. 上传一个文件并启动

本地需安装后台依赖，并在项目 `HBuilderX` 目录准备带 uni-app 编译器的 HBuilderX；服务器不需要这些工具。本地源码执行 `./package.ps1 -Update` 生成 `dist/hengshu-mall-update.tar.gz`，添加 `-Verify` 可验证更新包和采集容器。将这一个 tar.gz 上传到服务器 `/root/hengshu-mall/`。

更新前建议备份当前应用代码和配置到独立目录；数据库沿用原来的备份方案。现有商城继续使用原位置，不要删除 `data/` 或重新安装。解压和启动：

```sh
cd /root/hengshu-mall
tar --no-same-owner -xzf hengshu-mall-update.tar.gz
cd /root/hengshu-mall/crmeb-mall
docker-compose -f compose.yml up -d --build
docker-compose -f compose.yml ps
```

或者用 `bash start.sh` 启动，脚本自动识别两种 Compose 命令。直接使用 Compose 不需要先运行脚本，也不需要初始化京东密钥。首次构建需要联网下载镜像、Chromium 和 Python 依赖。

商城、队列、定时任务、长连接和京东采集默认一起启动。京东采集仍是独立容器，不共享商城数据库，在内部网络通过 `http://jd-crawler:8091` 通信。每个新发布包会更新 PHP 和后台容器的发布标识，使队列等进程同步加载更新后的代码。

`jd-crawler` 状态为 `healthy` 后查看登录信息：

```sh
docker-compose -f compose.yml exec jd-crawler python -m jd_crawler.bootstrap show
# 等价快捷命令：bash start.sh --info
```

命令会显示 `JD_VNC_PASSWORD` 和 `JD_CRAWLER_TOKEN`，在自己的终端查看即可。首次自动生成的凭据保存在 `jd-crawler-data` 命名卷，普通重启或重新创建容器会保留。原有 `.env` 中已设置的京东凭据会被沿用。

## 2. 在本地电脑登录京东

在本地电脑的 PowerShell 或终端执行，替换 `服务器IP`，保持该窗口打开：

```sh
ssh -N -L 6080:127.0.0.1:6080 root@服务器IP
```

本地浏览器打开 <http://127.0.0.1:6080/vnc.html>，输入上一步的 `JD_VNC_PASSWORD`。在页面显示的 Chromium 中登录京东，完成页面要求的验证。登录态保存在采集服务的数据卷，不需要每次启动重新登录；京东登录过期时按同样步骤重新登录。

无需配置 NPM，也无需向公网开放 6080、8091、5900 或 9222。若本地 6080 已占用，SSH 改为 `-L 16080:127.0.0.1:6080`，浏览器改打开 `http://127.0.0.1:16080/vnc.html`。

## 3. 后台使用

强制刷新管理后台，进入“商品采集配置”：

1. 打开独立的“本地京东采集”标签页，服务地址填 `http://jd-crawler:8091`，密钥填上面查询到的 `JD_CRAWLER_TOKEN`，保存。
2. 返回“基础配置”，在“接口选择”中选“本地京东采集服务”，保存。此接口只采集京东链接。

保存后进入 `/admin/product/add_product`，点击“链接采集”，粘贴完整京东商品详情链接。核对信息、补全分类/库存/运费后保存。采集素材按原文件字节保存，不压缩、不转换格式。

## 4. 维护

### 京东链接提示“获取token失败:缺少参数”

该提示来自原有一号通接口。旧版在未开启京东独立采集时，会把京东链接转交一号通。本包已修复：京东链接固定进入独立采集，配置缺失时直接提示开启或补全配置。

先在“本地京东采集”标签页填写连接信息，再在“基础配置 → 接口选择”中选择“本地京东采集服务”。服务启动和浏览器登录不会自动保存商城后台配置；访问密钥也不是京东账号或 VNC 密码。

本次同时更新了爬虫源代码，请执行 `docker-compose -f compose.yml up -d --build`，复用依赖缓存更新采集镜像。可用 `https://item.jd.com/100278221408.html` 重试，商品链接的推广查询参数会被自动移除。

### 图片清晰度与完整性

优先读取页面原图属性和最大 srcset，京东缩略图仅在原始素材地址可加载且像素更大时替换；加载失败会保留页面源地址。详情采集会展开详情区域、触发懒加载并读取详情背景图。上传仍保存下载文件的原始字节，不压缩、不转码、不裁剪，也不加水印。

已经采集入库的低像素文件不会自行恢复清晰度，需要重新采集并核对后保存；若京东本身只提供低分辨率素材，系统不会放大或伪造像素。

### 分类页装修和存储配置

“装修 → 当前主题 → 分类页”保留样式1（分类导航）、样式2（大图商品）、样式3（图文列表），三种都可调整搜索、图片、颜色、页面背景和广告。后两种支持单列大图／双列网格／图文列表、标签风格、名称行数与购买按钮。保存至当前主题；主题启用后商城生效，未启用主题可从主题列表预览。

本包包含 H5 文件，更新后可打开 `/pages/goods_cate/goods_cate` 验证；首页根路径仍进入管理后台。外部反向代理需将 `/pages/`、`/static/`、`/assets/` 转发到本包 Nginx。手机浏览器强制刷新即可加载新版本；已发行的 APP／小程序需要使用更新后的 `template/uni-app` 重新编译发布。旧的三种布局编号保持兼容，不需要迁移数据库。

“系统设置 → 存储配置”的存储方式单选已修复；选择已配置的存储后即时保存，服务端拒绝保存时会显示原因并恢复原选项。

### 主导航栏配置

入口统一为“装修 → 我的主题 → 编辑”，地址 `/admin/setting/edit_theme?id=主题ID&type=home`。在首页、商品详情、个人中心或微页面的“基础组件”中点击“导航栏”，再在右侧配置；每页最多一个，可通过画布工具隐藏或删除。商品详情页默认只有商品操作栏，仍可按需添加主导航组件。旧 `/admin/setting/main_navigation` 地址会转到主题编辑器。

导航栏提供“内容设置／样式设置”：名称、1～5个菜单、图文／纯文字／纯图标、选中和未选中图标、商城内部链接及拖动排序；支持跟随主题或自定义文字颜色，并复用详情页通用样式的背景图片、渐变、圆角、内外边距、边框与阴影。所有素材保持原文件，不压缩、不转换格式。

分类页也使用与其他页面一致的矩形画布，左侧拆成顶部搜索栏、分类组件1／2／3、分类结算栏、导航栏和页面设置。三种分类组件互相切换，各自的样式会保留；搜索栏、结算栏和导航栏可以单独增删。页面设置负责标题和整体背景，组件的“样式设置”负责自身外观。

保存只更新当前主题的当前页面：修改分类页导航不会覆盖首页，删除个人中心导航后也不会自动恢复首页导航。购物车沿用首页导航；分类结算栏会为导航留出空间，未添加主导航时商品操作栏固定在详情页最底部；添加后自动位于导航上方。旧主题的首页底部导航加载后自动适配为可编辑组件，无需 SQL 迁移。未启用主题需启用后才在正式商城生效。

导航栏内容设置可选“固定一直展示”或“智能隐藏”（下滑隐藏、上滑显示）。顶部搜索栏／搜索框可分别配置左右按钮，包括首页、返回、收藏、分享、客服和商城内部链接，支持名称、图标、显隐与排序。三个分类布局均可独立添加“分类结算栏”，配置购物车入口、金额、结算按钮与公共样式；“商品操作栏”仅在商品详情页的基础组件中可添加。底部组件按导航在下、业务操作栏在上的顺序排列，删除保存后不会自动恢复。

本包包含后台和 H5 生产文件。Android 配套安装物色 6.0.6；小程序需用更新后的源码重新编译发布。

### 京东云等国内服务器构建加速

构建默认通过清华 HTTPS 镜像下载 Debian/Chromium 和 Python 依赖；APT 仍校验 Debian 签名。启用 Docker BuildKit 的 APT/pip 下载缓存，下载中断后的重试可复用已下载的包。依赖安装在源码复制之前，源码修改不重新安装 Chromium 和 Python 依赖；文档、测试和本地文件不进入构建上下文。

首次升级这个 Dockerfile 时需要安装一次依赖，后续保留 Docker 缓存即可复用。服务器需要启用 BuildKit（当前 Docker 的默认构建器）；旧环境可在命令前加 `DOCKER_BUILDKIT=1`。不要用 `--no-cache` 或清理构建缓存来尝试加速。

查看具体耗时步骤，不停止正在运行的商城：

```sh
cd /root/hengshu-mall/crmeb-mall
docker-compose --progress plain -f compose.yml build jd-crawler
docker-compose -f compose.yml up -d
```

只有下载来源需要调整时，才在现有根目录 `.env` 中追加或修改以下项，保留原有账号配置：

```ini
JD_DEBIAN_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/debian
JD_DEBIAN_SECURITY_MIRROR=https://mirrors.tuna.tsinghua.edu.cn/debian-security
JD_PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
JD_PYTHON_IMAGE=python:3.12-slim-bookworm
```

如果卡在 `load metadata for docker.io/library/python` 或基础镜像层下载，这些软件源不控制 Docker Hub。可将 `JD_PYTHON_IMAGE` 改成你自己镜像仓库中相同的 Python 3.12 slim-bookworm 镜像地址。若需使用官方软件源，分别设置 `https://deb.debian.org/debian`、`https://security.debian.org/debian-security`、`https://pypi.org/simple`。镜像源的可达性和速度取决于服务器网络。

配置参考：[清华 Debian 镜像](https://mirrors.tuna.tsinghua.edu.cn/help/debian/)、[清华 PyPI 镜像](https://mirrors.tuna.tsinghua.edu.cn/help/pypi/)、[Docker 构建缓存](https://docs.docker.com/build/cache/optimize/)。

```sh
docker-compose -f compose.yml logs --tail=100 jd-crawler
docker-compose -f compose.yml exec jd-crawler python /app/healthcheck.py
docker-compose -f compose.yml restart jd-crawler
```

保留商城根目录 `.env`、`data/`、应用配置、安装锁、上传文件，以及 `jd-crawler-data` 卷。日常停止使用 `docker-compose -f compose.yml down`，不要添加 `-v`，该选项会删除京东登录态与服务凭据。

若此前已在 `/root/hengshu-mall/jd-crawler` 启动旧版独立 Compose，先在那个目录执行 `docker-compose down`（保留旧数据卷），再启动本包，避免登录端口被占用。本包使用新的服务卷，首次按步骤登录京东，并将本包生成的密钥填入后台。
