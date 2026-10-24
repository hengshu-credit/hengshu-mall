# 2026-10-24 PHP 安全修复与线上部署

北京时间 2026-10-24 23:49 完成商城 PHP 运行时切换。范围为
CVE-2026-109618、CVE-2026-109619，采用 PHP 官方紧急回补提交
`712e60f9edfd03f0960fc4fc3c2c375f42b90aa2`，应用到原 PHP 7.4.33 源码并重新编译。
原始补丁与构建方式见 [运行时说明](../runtime/php/README.md)。

源码提交：`4d5d9b57c`（安全回补与发布集成）、`f7aca4cf7`（Docker 跨平台镜像摘要校验）。
二者已推送至 `hengshu-credit/hengshu-mall` 的 `master`。

## 部署产物

| 项目 | 值 |
| --- | --- |
| 专用运行时包 | `dist/hengshu-php-security-20261024.tar.gz` |
| 包 SHA256 | `55be57890d07b2648f9409ae706573450244fa0e0d7881cafeb4abbb75748082` |
| 镜像标签 | `hengshu-php:7.4.33-security-20261024` |
| Linux 镜像配置摘要 | `sha256:b95fb20b5f53ac2fb758a834f0e84e4628df63cba8c35ac898caa8393fcb8a1e` |
| Docker Desktop OCI 索引摘要 | `sha256:6d649e50d2370ae08ba15b1bae74f0e2c1ff12ee2a066233c505a8832207be85` |
| 部署目录 | `/root/hengshu-mall/crmeb-mall` |
| 回滚备份 | `/root/hengshu-mall/releases/php-security-20261024T154849Z` |

专用包包含镜像、运行时构建源码、校验清单和部署器；不含商城业务/前端更新、账号配置、上传或数据库。
服务器通过完整压缩包 SHA256、包内文件摘要、镜像摘要、PHP CLI/FPM 二进制摘要校验。
首轮预检因 Docker Desktop 返回 OCI 索引摘要而 Linux 返回配置摘要停止，业务容器未切换；修正兼容校验后完成正式切换。

## 本轮验证

- 官方补丁与原源码包摘要校验、`--fuzz=0` 应用及 Docker 编译通过。
- 隔离 PHP/FPM 测试通过：原镜像的 OOM shutdown 路径可复现，新镜像直接退出；FPM 更换 worker 后请求恢复；会话、multipart 表单、上传和生产 OPcache 正常；不安全配置被启动校验拒绝。
- `tests/regression/run.ps1` 全部通过，包括账户并发、幂等、支付回调、事务回滚和履约场景；隔离 Redis 扩展真实读写通过。
- 部署脚本 4 项回归及发布/开发 Compose 配置检查通过。测试挂载本地工作区，不等同于生产交易验收。
- 线上 phpfpm、queue、timer、commerce、workerman 均切换到上述镜像，逐一运行安全验证通过；Nginx 配置检查通过。
- MySQL、Redis、京东采集和图片服务的容器 ID 保持不变；原 `.env`、应用 `.env`、`.constant`、安装锁摘要保持不变。
- 公网 `/admin/` 返回 HTTP 200；`/api/products?page=1&limit=1` 返回 HTTP 200、业务状态 200；`/notice` 与 `/msg` WebSocket 握手均返回 101。
- 本轮未重编译前端或原生客户端，也未执行真实支付/退款操作。

## 保留的问题

交易补偿健康检查在升级前后均报告 **2 条 `dead` 历史任务**，需要按业务证据人工核对，未进行强制重试或改状态。
队列连接可用、积压为 0，未知/逾期退款数均为 0。不能把这个已有告警描述为所有服务完全健康。

PHP 7.4 已结束常规维护。此次是两项内核漏洞的官方紧急兼容回补，并在请求解析前禁用会话上传进度；受支持 PHP 版本的完整兼容迁移仍需后续安排。
