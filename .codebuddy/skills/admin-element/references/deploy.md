# 管理端前端部署文档

## 1. 概述

本文档描述了 CRMEB 项目中管理端前端的部署流程，包括构建、部署、配置等环节，旨在规范前端部署流程，确保部署过程的顺利进行和系统的稳定运行。

## 2. 部署环境

### 2.1 服务器要求
- **操作系统**: Linux (Ubuntu 18.04+、CentOS 7+)
- **Web 服务器**: Nginx 1.14+ 或 Apache 2.4+
- **Node.js**: v12.0.0+ (仅构建时需要)
- **npm/yarn**: v6.0.0+ (仅构建时需要)
- **内存**: 至少 2GB RAM
- **CPU**: 至少 2 核 CPU
- **磁盘空间**: 至少 20GB 可用空间

### 2.2 环境准备
- **Web 服务器配置**: 配置虚拟主机，指向前端构建产物目录
- **SSL 证书**: 配置 HTTPS，使用 SSL 证书
- **防火墙**: 开放 80/443 端口
- **域名**: 配置域名解析，指向服务器 IP

## 3. 构建流程

### 3.1 开发环境构建
- **命令**: `npm run dev`
- **用途**: 本地开发，启动开发服务器
- **访问地址**: `http://localhost:8080`

### 3.2 测试环境构建
- **命令**: `npm run build:test`
- **用途**: 测试环境部署
- **构建产物**: `dist/` 目录

### 3.3 生产环境构建
- **命令**: `npm run build:prod`
- **用途**: 生产环境部署
- **构建产物**: `dist/` 目录

### 3.4 构建优化
- **代码压缩**: 压缩 JS/CSS/HTML 文件
- **资源压缩**: 压缩图片等静态资源
- **Tree Shaking**: 移除未使用的代码
- **代码分割**: 按路由分割代码
- **预加载**: 预加载关键资源

## 4. 部署方式

### 4.1 静态部署

#### 4.1.1 Nginx 配置
```nginx
server {
    listen 80;
    server_name admin.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.example.com;
    
    # SSL 配置
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    
    # 静态文件配置
    root /path/to/admin/dist;
    index index.html;
    
    # 路由重写，解决单页应用刷新 404 问题
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    # 日志配置
    access_log /var/log/nginx/admin_access.log;
    error_log /var/log/nginx/admin_error.log;
}
```

#### 4.1.2 Apache 配置
```apache
<VirtualHost *:80>
    ServerName admin.example.com
    Redirect permanent / https://admin.example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName admin.example.com
    
    # SSL 配置
    SSLEngine on
    SSLCertificateFile /path/to/ssl/cert.pem
    SSLCertificateKeyFile /path/to/ssl/key.pem
    
    # 静态文件配置
    DocumentRoot /path/to/admin/dist
    <Directory /path/to/admin/dist>
        AllowOverride All
        Require all granted
    </Directory>
    
    # 路由重写，解决单页应用刷新 404 问题
    <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </IfModule>
    
    # 日志配置
    ErrorLog ${APACHE_LOG_DIR}/admin_error.log
    CustomLog ${APACHE_LOG_DIR}/admin_access.log combined
</VirtualHost>
```

### 4.2 容器部署

#### 4.2.1 Dockerfile
```dockerfile
# 基础镜像
FROM node:12-alpine as build

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build:prod

# 生产镜像
FROM nginx:1.19-alpine

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### 4.2.2 Docker Compose
```yaml
version: '3'
services:
  admin:
    build: .
    ports:
      - "80:80"
    restart: always
    volumes:
      - ./ssl:/etc/nginx/ssl
    environment:
      - TZ=Asia/Shanghai
```

#### 4.2.3 部署命令
```bash
# 构建镜像
docker build -t crmeb-admin .

# 运行容器
docker run -d --name crmeb-admin -p 80:80 crmeb-admin

# 使用 Docker Compose
docker-compose up -d
```

### 4.3 CDN 部署

#### 4.3.1 配置 CDN
- **源站设置**: 指向静态文件服务器
- **缓存策略**: 配置静态资源缓存时间
- **HTTPS**: 开启 HTTPS
- **HTTP/2**: 开启 HTTP/2

#### 4.3.2 部署流程
1. 构建前端项目
2. 上传构建产物到 CDN
3. 配置 CDN 缓存策略
4. 验证部署结果

## 5. 配置管理

### 5.1 环境变量配置
- **开发环境**: `.env.development`
- **测试环境**: `.env.test`
- **生产环境**: `.env.production`

### 5.2 配置示例
```env
# API 基础地址
VUE_APP_API_BASE_URL=https://api.example.com

# 静态资源 CDN 地址
VUE_APP_CDN_BASE_URL=https://cdn.example.com

# 应用名称
VUE_APP_TITLE=CRMEB 管理后台

# 构建环境
NODE_ENV=production

# 构建版本
VUE_APP_VERSION=1.0.0
```

### 5.3 运行时配置
- **API 地址**: 可通过环境变量或配置文件修改
- **主题配置**: 可通过配置文件修改
- **权限配置**: 可通过后端 API 动态获取

## 6. 部署流程

### 6.1 手动部署
1. **拉取代码**: `git pull origin master`
2. **安装依赖**: `npm install`
3. **构建项目**: `npm run build:prod`
4. **部署文件**: 将 `dist/` 目录复制到服务器
5. **配置 Web 服务器**: 配置虚拟主机
6. **重启服务**: 重启 Web 服务器
7. **验证部署**: 访问管理端地址

### 6.2 自动化部署

#### 6.2.1 CI/CD 配置
- **Jenkins**: 配置 Jenkins 任务，实现自动构建和部署
- **GitLab CI**: 配置 `.gitlab-ci.yml`，实现自动构建和部署
- **GitHub Actions**: 配置 `.github/workflows/deploy.yml`，实现自动构建和部署

#### 6.2.2 GitHub Actions 示例
```yaml
name: Deploy Admin Frontend

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '12'

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build:prod

      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v2.1.5
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          ARGS: '-rltgoDzvO --delete'
          SOURCE: 'dist/'
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          REMOTE_PORT: ${{ secrets.REMOTE_PORT }}
          TARGET: ${{ secrets.REMOTE_TARGET }}

      - name: Restart Nginx
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.REMOTE_HOST }}
          username: ${{ secrets.REMOTE_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.REMOTE_PORT }}
          script: sudo systemctl restart nginx
```

## 7. 监控与维护

### 7.1 监控
- **访问日志**: 分析 Web 服务器访问日志
- **错误日志**: 监控 Web 服务器错误日志
- **性能监控**: 监控页面加载速度、响应时间
- **可用性监控**: 监控服务可用性，设置告警

### 7.2 维护
- **定期更新**: 定期更新前端代码，修复漏洞
- **缓存清理**: 定期清理 CDN 缓存
- **日志清理**: 定期清理日志文件
- **备份**: 定期备份构建产物和配置文件

### 7.3 常见问题

#### 7.3.1 404 问题
- **问题**: 刷新页面出现 404 错误
- **解决方案**: 配置 Web 服务器，将所有请求重定向到 index.html

#### 7.3.2 静态资源加载失败
- **问题**: 静态资源（JS/CSS/图片）加载失败
- **解决方案**: 检查静态资源路径，确保 CDN 配置正确

#### 7.3.3 API 调用失败
- **问题**: 前端无法调用后端 API
- **解决方案**: 检查 API 地址配置，确保后端服务正常运行

#### 7.3.4 性能问题
- **问题**: 页面加载慢，卡顿
- **解决方案**: 优化前端代码，使用 CDN，启用 HTTP/2

## 8. 回滚策略

### 8.1 版本管理
- **版本号**: 遵循语义化版本规范
- **发布记录**: 记录每次发布的版本和变更内容
- **备份**: 备份每次发布的构建产物

### 8.2 回滚流程
1. **停止服务**: 停止当前版本的服务
2. **恢复备份**: 恢复到上一个稳定版本
3. **重启服务**: 启动恢复后的服务
4. **验证回滚**: 验证服务是否正常运行

### 8.3 回滚方案
- **手动回滚**: 手动复制备份文件到部署目录
- **自动化回滚**: 通过 CI/CD 工具实现自动回滚
- **容器回滚**: 通过 Docker 镜像版本回滚

## 9. 安全部署

### 9.1 HTTPS 配置
- **SSL 证书**: 使用正规 CA 签发的 SSL 证书
- **证书续期**: 定期续期 SSL 证书
- **HTTP 重定向**: 将 HTTP 请求重定向到 HTTPS

### 9.2 安全头部
- **Content-Security-Policy**: 配置内容安全策略
- **X-Content-Type-Options**: 防止 MIME 类型嗅探
- **X-Frame-Options**: 防止点击劫持
- **X-XSS-Protection**: 启用 XSS 过滤

### 9.3 访问控制
- **IP 白名单**: 限制管理端访问 IP
- **登录验证**: 强制登录验证
- **权限控制**: 基于角色的权限控制
- **会话管理**: 安全的会话管理

### 9.4 漏洞防护
- **依赖扫描**: 定期扫描依赖包漏洞
- **代码审计**: 定期进行代码安全审计
- **渗透测试**: 定期进行渗透测试

## 10. 最佳实践

### 10.1 构建优化
- **使用缓存**: 缓存依赖包和构建产物
- **并行构建**: 使用多线程并行构建
- **增量构建**: 只构建变更的文件
- **构建日志**: 保存构建日志，便于排查问题

### 10.2 部署优化
- **灰度发布**: 采用灰度发布策略
- **蓝绿部署**: 采用蓝绿部署策略
- **滚动部署**: 采用滚动部署策略
- **金丝雀发布**: 采用金丝雀发布策略

### 10.3 监控优化
- **实时监控**: 实时监控系统运行状态
- **告警机制**: 设置合理的告警阈值
- **日志聚合**: 聚合多服务器日志
- **性能分析**: 定期分析系统性能

### 10.4 安全优化
- **最小权限**: 遵循最小权限原则
- **定期更新**: 定期更新依赖和系统
- **安全扫描**: 定期进行安全扫描
- **应急响应**: 建立安全应急响应机制

## 11. 总结

本文档描述了 CRMEB 项目中管理端前端的部署流程，包括构建、部署、配置等环节，以及相关的最佳实践和常见问题解决方案。

遵循本文档的部署流程和规范，可以确保前端部署的顺利进行和系统的稳定运行，同时提高部署效率和系统安全性。

随着项目的发展和技术的演进，部署流程也需要不断优化和调整，以适应新的业务需求和技术挑战。