# PHP 7.4.33 紧急安全运行时

针对 CVE-2026-109618、CVE-2026-109619，将 PHP 官方提交
[`712e60f9edfd03f0960fc4fc3c2c375f42b90aa2`](https://github.com/php/php-src/commit/712e60f9edfd03f0960fc4fc3c2c375f42b90aa2)
完整应用到项目原镜像内的 PHP 7.4.33 源码。补丁来自官方 API，不修改第三方 Composer 依赖。
官方紧急分支基于更早的 7.4 源码，因此没有直接用该分支替换 7.4.33。

- [PHP 官方安全公告及 EOL 回补入口](https://www.php.net/archive/2026.php#2026-10-21-5)
- [OOM 公告](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w)
- [请求状态公告](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp)
- [2026-10-23 会话上传进度公告](https://www.php.net/archive/2026.php#2026-10-23-1)

这是保留现有商城兼容性的紧急回补。PHP 7.4 已停止官方常规维护，本镜像不代表整个旧运行时和依赖已消除所有已知漏洞；仍需另行完成受支持 PHP 版本迁移。

## 构建与验证

从仓库根目录执行：

```powershell
docker build -f help/runtime/php/php.Dockerfile -t hengshu-php:7.4.33-security-20261024 help/runtime/php
& ./HBuilderX/plugins/node/node.exe tests/regression/php_security.cjs
./tests/regression/run.ps1
```

基础镜像固定 digest；源码包 SHA256 为 `924846abf93bc613815c55dd3f5809377813ac62a9ec4eb3778675b82a27b927`，
上游原始补丁 SHA256 为 `5fe57ca6ee96d59b36c6e0ca842843c50884f177bef1e85234cf669b577f5e48`。
构建必须先校验这两个摘要，并以 `--fuzz=0` 应用完整补丁，失败立即停止。
构建依赖使用 Debian 官方归档库，保留 APT 签名和包摘要验证。

PHP CLI、FPM、OPcache 和内置共享扩展一同重编译，保留原配置及 Redis 扩展 ABI。
镜像在请求解析前关闭 `session.upload_progress.enabled`，也覆盖 10 月 23 日补充公告的相关路径。
普通文件上传仍可用。官方 EOL 补丁在 OOM 时直接结束进程；此时不会运行 PHP shutdown 回调，FPM 会补充 worker。
业务恢复必须依赖现有事务、幂等和持久化补偿，不能依赖 OOM 后清理回调。

运行时验证同时核对上游标识、CLI/FPM 文件摘要、回补增加的 multipart 配置和所需扩展。
版本号仍显示 `7.4.33`，不能单凭 `php -v` 判断是否已修复：

```sh
docker compose exec -T phpfpm php -d open_basedir=/usr/local /usr/local/lib/php-security/verify.php
```

这里的 `open_basedir` 仅放开验证进程对 `/usr/local` 的读取，不改变商城业务进程的目录限制。

回归使用隔离容器：检验 OOM 不进入 shutdown、FPM worker 更换后请求恢复、复用 worker、会话、multipart 表单和上传、错误配置拒绝启动。不会向生产环境发送 OOM 或漏洞探测请求。

## 发布

发布 Compose 中所有 PHP 服务使用同一个安全镜像；完整安装包和更新包包含 `php-runtime/` 构建上下文。
仅更新 PHP 时使用专用运行时更新包，不需要重编译或覆盖商城前端、业务代码和数据库。
在源码执行 `./help/release/package-php-security.ps1`，生成 `dist/hengshu-php-security-20261024.tar.gz` 和 `.sha256`。
该专用包包含通过运行时和隔离交易回归的镜像；上传并校验 SHA256 后，在独立目录解压：

```sh
tar -xzf hengshu-php-security-20261024.tar.gz
python3 php-security-20261024/apply-php-security.py /root/hengshu-mall/crmeb-mall --check
python3 php-security-20261024/apply-php-security.py /root/hengshu-mall/crmeb-mall
```

部署器先检查现有安装、加载并核对镜像摘要、保存旧 Compose 与运行时镜像，再切换 PHP 服务。
它保持 MySQL、Redis、京东采集和图片服务的容器身份，核对原配置/安装锁摘要，并检查商城 HTTP 响应。
失败时恢复此前运行的 PHP 镜像；此时必须报告安全更新未生效，不能把回滚当成修复成功。
PHP-FPM 更换后必须同步重建 queue、timer、commerce、workerman，以及刷新 Nginx upstream。
仅重启 FPM 或只替换宿主机 PHP 均不能覆盖所有服务。

开发入口 `help/dev/dev.ps1` 和基础 Compose 也使用安全镜像。
使用其他回归镜像参数时，需要自行核对该镜像是否具有本次修复。
