# crmeb 目录文件说明

## 目录结构概览
```
crmeb/
├── app/                 # 应用程序核心代码（控制器、模型、服务等）
├── backup/              # 数据备份文件
├── config/              # 配置文件（数据库、缓存、接口等）
├── crmeb/               # 项目内部公共模块或扩展库
├── public/              # Web 可访问入口（静态资源、index.php）
├── route/               # 路由定义
├── runtime/             # 运行时缓存、日志、Session 等（需忽略版本控制）
│
├── .constant            # 常量定义文件（需忽略版本控制）
├── .dockerignore        # Docker 构建忽略规则
├── .env                 # 环境变量配置（敏感信息）（需忽略版本控制）
├── .env.example         # 环境变量示例文件
├── .htaccess            # Apache 重写规则
├── .phpstorm.meta.php   # PhpStorm 元数据
├── .travis.yml          # Travis CI 配置
├── .version             # 版本信息
├── Dockerfile           # Docker 镜像构建文件
├── LICENSE.txt          # 开源许可协议
├── README.md            # 项目说明
├── build.example.php    # 构建示例脚本
├── composer.json        # Composer 依赖配置
├── composer.lock        # Composer 锁定版本
├── filetree.txt         # 文件树结构快照
├── index.html           # 默认首页（防访问目录）
├── my.cnf               # MySQL 自定义配置（需忽略版本控制）
├── nginx.conf           # Nginx 配置（需忽略版本控制）
├── php-fpm.conf         # PHP-FPM 配置（需忽略版本控制）
├── php-ini-overrides.ini# PHP 自定义 ini 覆盖（需忽略版本控制）
├── redis.conf           # Redis 配置（需忽略版本控制）
├── start.sh             # 项目启动脚本（需忽略版本控制）
├── supervisord.conf     # Supervisor 进程管理配置（需忽略版本控制）
├── think                # ThinkPHP 框架入口文件
├── vhost.conf           # 虚拟主机配置（需忽略版本控制）
└── workerman.bat        # Windows 下 Workerman 启动脚本
```

## 主要目录说明
- **app/**  
  存放业务逻辑的核心代码，包括控制器(Controller)、模型(Model)、服务层(Service)等，遵循 MVC 或类似分层架构。
- **backup/**  
  用于存放数据库或重要数据的备份文件，建议定期清理旧备份。
- **config/**  
  各种环境与应用配置文件，如数据库、缓存、队列、接口认证等。
- **crmeb/**  
  项目内部的公共模块或第三方 SDK 集成，可能包含一些工具类或扩展功能。
- **public/**  
  Web 服务器根目录，放置可直接通过浏览器访问的资源（如图片、JS、CSS）以及入口文件 `index.php`。
- **route/**  
  路由定义文件，用于映射 URL 请求到具体的控制器方法。
- **runtime/**  
  存放运行时生成的缓存、日志、Session 等临时数据；此目录应在 `.gitignore` 中忽略。

## 主要文件说明
- **.env / .env.example**  
  环境变量配置与示例，`.env` 含敏感信息，不要提交到代码库。
- **composer.json / composer.lock**  
  PHP 项目依赖管理配置与锁定文件。
- **Dockerfile / docker-compose 相关**  
  用于容器化部署的配置。
- **my.cnf / redis.conf / nginx.conf**  
  各类服务的自定义配置。
- **start.sh**  
  项目本地或服务器启动入口脚本。
- **think**  
  ThinkPHP 框架的统一入口文件，负责初始化框架并分发请求。