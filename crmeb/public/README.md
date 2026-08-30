# public 目录结构说明

## 目录结构

```
:.
├── .htaccess               # Apache伪静态配置
├── admin/                  # 后台管理静态资源
├── assets/                 # 公共静态资源
├── favicon.ico             # 网站图标
├── index.html              # 静态HTML入口
├── index.php              # PHP入口文件
├── install/                # 安装向导目录
├── mobile.html             # 移动端入口HTML
├── nginx.htaccess          # Nginx伪静态配置
├── pages/                  # 页面模板目录
├── product_migration.xlsx  # 商品迁移Excel模板
├── robots.txt              # 搜索引擎robots文件
├── router.php              # 路由入口文件
├── service_pay_result.html # 支付结果页面
├── static/                 # 静态文件目录
├── statics/                # 静态资源目录（样式、脚本）
├── upgrade/                # 升级向导目录
├── uploads/                # 上传文件目录
└── README.md              # 目录说明文件
```

## 目录说明

- **admin/** - 后台管理端静态资源（CSS、JS、图片）
- **assets/** - 项目公共静态资源
- **index.php** - 项目主入口文件
- **install/** - 系统安装向导
- **static/statics** - 前端静态资源目录
- **uploads/** - 用户上传文件目录
- **pages/** - 移动端页面模板

## 功能说明

public目录是网站的入口目录：

- **入口作用** - 外部访问项目的唯一入口
- **静态资源** - 存放CSS、JS、图片等静态文件
- **安全隔离** - 通过入口文件路由，隐藏项目内部结构
- **伪静态** - 通过.htaccess实现URL重写

## 安全说明

- 不应在此目录存放敏感文件
- 上传目录应限制文件类型
- 定期清理临时上传文件
