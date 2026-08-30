# PHP常用命令文档

## 1. 概述

本文档描述了 CRMEB 项目中常用的 PHP 命令，包括 PHP 基础命令、Composer 命令、ThinkPHP 命令、CRMEB 特定命令等，旨在帮助开发者快速了解和使用这些命令，提高开发效率。

## 2. PHP 基础命令

### 2.1 PHP 版本查看

```bash
# 查看 PHP 版本
php -v

# 查看 PHP 详细信息
php -i

# 查看 PHP 配置文件位置
php --ini
```

### 2.2 PHP 运行命令

```bash
# 运行 PHP 文件
php filename.php

# 交互式运行 PHP
php -a

# 执行 PHP 代码
php -r "echo 'Hello, CRMEB!';"

# 检查语法错误
php -l filename.php
```

### 2.3 PHP 扩展管理

```bash
# 查看已安装的扩展
php -m

# 查看特定扩展的信息
php -i | grep extension_name

# 查看扩展目录
php -i | grep extension_dir
```

## 3. Composer 命令

### 3.1 Composer 基础命令

```bash
# 查看 Composer 版本
composer -V

# 初始化 Composer 项目
composer init

# 安装依赖
composer install

# 更新依赖
composer update

# 添加新依赖
composer require package_name

# 移除依赖
composer remove package_name

# 查看已安装的依赖
composer show

# 优化自动加载
composer dump-autoload

# 优化自动加载（生产环境）
composer dump-autoload --optimize
```

### 3.2 Composer 配置命令

```bash
# 查看 Composer 配置
composer config --list

# 设置 Composer 镜像
composer config -g repo.packagist composer https://mirrors.aliyun.com/composer/

# 取消 Composer 镜像设置
composer config -g --unset repo.packagist
```

## 4. ThinkPHP 命令

### 4.1 ThinkPHP 基础命令

```bash
# 查看 ThinkPHP 命令列表
php think

# 查看命令帮助
php think help command_name

# 清除缓存
php think clear

# 查看路由列表
php think route:list

# 生成应用密钥
php think generate:key
```

### 4.2 数据库相关命令

```bash
# 运行数据库迁移
php think migrate:run

# 回滚数据库迁移
php think migrate:rollback

# 创建数据库迁移文件
php think migrate:create migration_name

# 运行数据库种子
php think seed:run

# 创建数据库种子文件
php think seed:create seed_name
```

### 4.3 代码生成命令

```bash
# 生成模型
php think make:model ModelName

# 生成控制器
php think make:controller ControllerName

# 生成中间件
php think make:middleware MiddlewareName

# 生成验证器
php think make:validate ValidateName

# 生成事件
php think make:event EventName

# 生成监听器
php think make:listener ListenerName
```

## 5. CRMEB 特定命令

### 5.1 CRMEB 代码生成命令

```bash
# 生成 CRUD 代码
php think crmeb:build

# 生成 API 接口
php think crmeb:api

# 生成后台管理
php think crmeb:admin
```

### 5.2 CRMEB 系统命令

```bash
# 查看系统版本
php think crmeb:version

# 系统初始化
php think crmeb:init

# 清理系统缓存
php think crmeb:clear

# 生成系统配置
php think crmeb:config
```

### 5.3 队列相关命令

```bash
# 启动队列监听器
php think queue:listen

# 启动队列工作进程
php think queue:work

# 查看队列状态
php think queue:status

# 重启队列
php think queue:restart
```

### 5.4 定时任务命令

```bash
# 启动定时任务
php think timer start --d

# 停止定时任务
php think timer stop

# 查看定时任务状态
php think timer status
```

### 5.5 长连接命令

```bash
# 启动长连接服务
php think workerman start --d

# 停止长连接服务
php think workerman stop

# 重启长连接服务
php think workerman restart

# 查看长连接服务状态
php think workerman status
```

## 6. 开发工具命令

### 6.1 代码检查命令

```bash
# 使用 PHP_CodeSniffer 检查代码规范
./vendor/bin/phpcs

# 使用 PHPStan 进行静态分析
./vendor/bin/phpstan analyze

# 使用 Psalm 进行静态分析
./vendor/bin/psalm
```

### 6.2 测试命令

```bash
# 运行 PHPUnit 测试
./vendor/bin/phpunit

# 运行特定测试
./vendor/bin/phpunit tests/TestCase.php

# 生成测试覆盖率报告
./vendor/bin/phpunit --coverage-html coverage
```

### 6.3 代码格式化命令

```bash
# 使用 PHP-CS-Fixer 格式化代码
./vendor/bin/php-cs-fixer fix

# 使用 Pretty PHP 格式化代码
./vendor/bin/pretty-php
```

## 7. 部署命令

### 7.1 项目构建命令

```bash
# 安装依赖（生产环境）
composer install --no-dev --optimize-autoloader

# 编译前端资源
npm install
npm run build

# 清理缓存
php think clear
```

### 7.2 服务器部署命令

```bash
# 上传代码到服务器
scp -r local_directory user@server:/remote_directory

# 远程执行命令
ssh user@server "cd /project/directory && php think clear"

# 使用 rsync 同步代码
rsync -avz --exclude='.git' --exclude='vendor' local_directory/ user@server:/remote_directory/
```

### 7.3 Docker 部署命令

```bash
# 构建 Docker 镜像
docker build -t crmeb .

# 运行 Docker 容器
docker run -d --name crmeb -p 80:80 crmeb

# 查看 Docker 容器状态
docker ps

# 进入 Docker 容器
docker exec -it crmeb bash
```

## 8. 数据库命令

### 8.1 MySQL 命令

```bash
# 连接 MySQL 数据库
mysql -u username -p database_name

# 导入 SQL 文件
mysql -u username -p database_name < crmeb.sql

# 导出 SQL 文件
mysqldump -u username -p database_name > backup.sql

# 导出特定表
mysqldump -u username -p database_name table1 table2 > backup.sql
```

### 8.2 数据库迁移命令

```bash
# 创建迁移文件
php think migrate:create CreateUsersTable

# 运行迁移
php think migrate:run

# 回滚迁移
php think migrate:rollback

# 查看迁移状态
php think migrate:status
```

### 8.3 数据库种子命令

```bash
# 创建种子文件
php think seed:create UserSeeder

# 运行种子
php think seed:run

# 运行特定种子
php think seed:run --seed=UserSeeder
```

## 9. 性能优化命令

### 9.1 代码优化命令

```bash
# 优化 Composer 自动加载
composer dump-autoload --optimize --classmap-authoritative

# 生成 OPcache 预热脚本
php -r '$files = glob(__DIR__ . "/vendor/**/*.php", GLOB_BRACE); foreach ($files as $file) { require_once $file; }'
```

### 9.2 缓存优化命令

```bash
# 清除所有缓存
php think clear

# 清除模板缓存
php think clear --template

# 清除配置缓存
php think clear --config

# 清除路由缓存
php think clear --route
```

### 9.3 数据库优化命令

```bash
# 优化 MySQL 表
mysql -u username -p -e "OPTIMIZE TABLE table1, table2;" database_name

# 修复 MySQL 表
mysql -u username -p -e "REPAIR TABLE table1, table2;" database_name

# 分析 MySQL 表
mysql -u username -p -e "ANALYZE TABLE table1, table2;" database_name
```

## 10. 故障排查命令

### 10.1 日志查看命令

```bash
# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log

# 查看 PHP-FPM 错误日志
tail -f /var/log/php-fpm/error.log

# 查看 CRMEB 应用日志
tail -f runtime/log/$(date +%Y%m%d).log

# 查看慢查询日志
tail -f /var/log/mysql/mysql-slow.log
```

### 10.2 进程查看命令

```bash
# 查看 PHP-FPM 进程
ps aux | grep php-fpm

# 查看 Nginx 进程
ps aux | grep nginx

# 查看 MySQL 进程
ps aux | grep mysql

# 查看 CRMEB 队列进程
ps aux | grep queue:work
```

### 10.3 网络查看命令

```bash
# 查看端口占用
netstat -tuln

# 查看特定端口占用
lsof -i :80

# 查看网络连接
netstat -an | grep ESTABLISHED

# 测试网络连接
ping example.com

# 测试端口连接
telnet example.com 80
```

## 11. 最佳实践

### 11.1 命令使用建议

- **使用绝对路径**: 执行命令时尽量使用绝对路径，避免路径问题
- **添加执行权限**: 对于脚本文件，记得添加执行权限
- **使用别名**: 对于常用命令，可以在 `.bashrc` 或 `.zshrc` 中添加别名
- **查看帮助**: 遇到不熟悉的命令，使用 `--help` 查看帮助信息
- **记录常用命令**: 将常用命令记录在文档中，方便查阅

### 11.2 安全建议

- **避免使用 root 用户**: 执行 PHP 命令时，避免使用 root 用户
- **保护敏感信息**: 避免在命令行中直接输入密码等敏感信息
- **限制命令执行权限**: 对于生产环境，限制命令的执行权限
- **定期更新依赖**: 定期使用 `composer update` 更新依赖，修复安全漏洞

### 11.3 性能建议

- **使用缓存**: 对于频繁执行的命令，考虑使用缓存
- **并行执行**: 对于独立的任务，可以考虑并行执行
- **限制输出**: 对于产生大量输出的命令，使用管道或重定向限制输出
- **使用后台执行**: 对于耗时较长的命令，使用后台执行

## 12. 常见问题

### 12.1 PHP 命令执行失败

- **问题**: 执行 PHP 命令时提示 "Command not found"
- **解决方案**: 检查 PHP 是否已安装，以及是否在 PATH 环境变量中

### 12.2 Composer 命令执行失败

- **问题**: 执行 Composer 命令时提示 "Composer could not find a composer.json file"
- **解决方案**: 确保在项目根目录执行命令，且存在 composer.json 文件

### 12.3 ThinkPHP 命令执行失败

- **问题**: 执行 ThinkPHP 命令时提示 "Class not found"
- **解决方案**: 执行 `composer dump-autoload` 更新自动加载

### 12.4 数据库命令执行失败

- **问题**: 执行数据库命令时提示 "Access denied for user"
- **解决方案**: 检查数据库用户名和密码是否正确，以及是否有相应的权限

### 12.5 队列命令执行失败

- **问题**: 执行队列命令时提示 "Queue not found"
- **解决方案**: 检查队列配置是否正确，以及队列服务是否启动

## 13. 参考资源

- [PHP 官方文档](https://www.php.net/docs.php)
- [Composer 官方文档](https://getcomposer.org/doc/)
- [ThinkPHP 官方文档](https://www.kancloud.cn/manual/thinkphp6_0)
- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [Docker 官方文档](https://docs.docker.com/)
- [Linux 命令大全](https://www.runoob.com/linux/linux-command-manual.html)

## 14. 总结

本文档介绍了 CRMEB 项目中常用的 PHP 命令，包括 PHP 基础命令、Composer 命令、ThinkPHP 命令、CRMEB 特定命令、数据库命令、性能优化命令、故障排查命令等。

通过掌握这些命令，开发者可以更加高效地进行项目开发、部署和维护。同时，本文档也提供了一些最佳实践和常见问题的解决方案，希望能够帮助开发者避免一些常见的问题。

随着项目的发展和技术的演进，这些命令也可能会有所变化，建议开发者定期查阅相关文档，了解最新的命令和用法。