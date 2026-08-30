# CRMEB MCP Server

基于 Model Context Protocol (MCP) 的 CRMEB API 工具服务器，已集成到 CRMEB outapi 模块中，允许 AI 助手通过标准协议调用 CRMEB 对外开放接口。

## 功能特性

- 🔗 集成到 CRMEB outapi 模块，无需额外部署
- 📦 商品管理（列表、详情、创建）
- 📂 分类管理（列表、详情、创建）
- 🛒 订单管理（列表、详情、发货）
- 💰 售后管理（列表、详情、同意/拒绝退款）
- 🎫 优惠券管理
- 👥 用户管理（列表、详情、赠送余额/积分）

## 环境要求

- CRMEB 系统
- PHP >= 7.4

## 快速开始

### 1. 创建开放接口账号

1. 登录 CRMEB 管理后台
2. 进入 **设置** -> **系统设置** -> **开放接口**
3. 创建应用获取账号和密码

### 2. 配置到 Claude Desktop

编辑配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "crmeb": {
      "url": "http://your-domain/outapi/mcp",
      "headers": {
        "account": "your_account",
        "password": "your_password",
        "Content-Type": "application/json"
      },
      "disabled": false
    }
  }
}
```

**配置示例（演示环境）：**
```json
{
  "mcpServers": {
    "crmebdemo": {
      "url": "https://v5.crmeb.net/outapi/mcp",
      "headers": {
        "account": "ceshi",
        "password": "ceshiceshi",
        "Content-Type": "application/json"
      },
      "disabled": false
    }
  }
}
```

### 3. 配置到 Cursor

在 Cursor 设置中添加：

```json
{
  "mcp.servers": {
    "crmeb": {
      "url": "http://your-domain/outapi/mcp",
      "headers": {
        "account": "your_account",
        "password": "your_password",
        "Content-Type": "application/json"
      },
      "disabled": false
    }
  }
}
```

**参数说明：**

| 参数 | 说明 | 获取方式 |
|------|------|---------|
| `url` | CRMEB MCP 接口地址 | 固定值：`http://域名/outapi/mcp` |
| `account` | 开放接口账号 | CRMEB 后台 -> 设置 -> 开放接口 |
| `password` | 开放接口密码 | CRMEB 后台 -> 设置 -> 开放接口 |
| `disabled` | 是否禁用该服务 | 可选，默认为 false |

> 注意：直接配置 account 和 password 即可，系统会自动完成认证

## 支持的 MCP 客户端应用

以下是目前主流的支持 MCP 协议的应用程序，您可以在这些应用中配置和使用 CRMEB MCP 服务。

### 1. Claude Desktop

Anthropic 官方桌面应用，首个原生支持 MCP 的客户端。

**配置步骤：**
1. 下载并安装 [Claude Desktop](https://claude.ai/download)
2. 找到配置文件：
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
3. 添加 CRMEB MCP 配置：
```json
{
  "mcpServers": {
    "crmeb": {
      "url": "http://your-domain/outapi/mcp",
      "headers": {
        "account": "your_account",
        "password": "your_password",
        "Content-Type": "application/json"
      },
      "disabled": false
    }
  }
}
```
4. 重启 Claude Desktop

**使用方法：**
在对话中直接询问，例如：
```
帮我查询 CRMEB 中的商品分类列表
```

### 2. Cursor

AI 驱动的代码编辑器，内置 MCP 支持。

**配置步骤：**
1. 下载并安装 [Cursor](https://cursor.sh/)
2. 打开设置（Settings -> Features -> Model Context Protocol）
3. 添加 MCP 服务器配置：
```json
{
  "mcp.servers": {
    "crmeb": {
      "url": "http://your-domain/outapi/mcp",
      "headers": {
        "account": "your_account",
        "password": "your_password",
        "Content-Type": "application/json"
      },
      "disabled": false
    }
  }
}
```
4. 或者直接编辑配置文件：
   - **macOS/Linux**: `~/.cursor/mcp.json`
   - **Windows**: `%APPDATA%\Cursor\mcp.json`

**使用方法：**
在 Cursor 的 AI 聊天窗口中直接使用：
```
查询 CRMEB 中的订单列表
```

### 3. Cline (VS Code 扩展)

VS Code 中的自主 AI 编程助手扩展。

**配置步骤：**
1. 在 VS Code 中安装 [Cline 扩展](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev)
2. 打开 VS Code 设置
3. 搜索 "Cline MCP" 或在 Cline 面板中找到 MCP 配置
4. 添加 MCP 服务器：
```json
{
  "mcpServers": {
    "crmeb": {
      "url": "http://your-domain/outapi/mcp",
      "headers": {
        "account": "your_account",
        "password": "your_password",
        "Content-Type": "application/json"
      },
      "disabled": false
    }
  }
}
```

**使用方法：**
在 Cline 面板中输入指令：
```
获取 CRMEB 商品 ID 为 1 的详情
```

### 4. Windsurf

Codeium 推出的 AI 原生 IDE。

**配置步骤：**
1. 下载并安装 [Windsurf](https://codeium.com/windsurf)
2. 打开设置 -> Developer Settings -> MCP Servers
3. 添加配置：
```json
{
  "mcpServers": {
    "crmeb": {
      "url": "http://your-domain/outapi/mcp",
      "headers": {
        "account": "your_account",
        "password": "your_password",
        "Content-Type": "application/json"
      }
    }
  }
}
```

### 5. Continue (VS Code/JetBrains 扩展)

开源的 AI 代码助手扩展。

**配置步骤：**
1. 安装 Continue 扩展
   - [VS Code](https://marketplace.visualstudio.com/items?itemName=Continue.continue)
   - [JetBrains](https://plugins.jetbrains.com/plugin/22707-continue)
2. 打开 Continue 配置文件（`~/.continue/config.json`）
3. 添加 MCP 配置：
```json
{
  "models": [...],
  "mcpServers": {
    "crmeb": {
      "url": "http://your-domain/outapi/mcp",
      "headers": {
        "account": "your_account",
        "password": "your_password",
        "Content-Type": "application/json"
      }
    }
  }
}
```

### 6. Zed

高性能代码编辑器，支持 MCP 协议。

**配置步骤：**
1. 下载并安装 [Zed](https://zed.dev/)
2. 打开配置文件（`~/.zed/settings.json`）
3. 添加 MCP 服务器配置：
```json
{
  "mcp_servers": {
    "crmeb": {
      "url": "http://your-domain/outapi/mcp",
      "headers": {
        "account": "your_account",
        "password": "your_password",
        "Content-Type": "application/json"
      }
    }
  }
}
```

### 7. 其他支持 MCP 的应用

以下应用也在逐步支持 MCP 协议：

- **Codeium**：AI 代码补全工具
- **Tabnine**：AI 代码助手
- **Sourcegraph Cody**：代码智能助手

> 💡 **提示**：MCP 是一个开放协议，越来越多的 AI 应用正在支持。如果您的应用支持 MCP，通常可以在设置中找到 MCP 或 Model Context Protocol 相关配置项。

## 可用工具

### 分类管理

| 工具名称 | 描述 | 必需参数 | 可选参数 |
|---------|------|---------|---------|
| `crmeb_category_list` | 获取分类列表 | - | page, limit |
| `crmeb_category_detail` | 获取分类详情 | id | - |
| `crmeb_category_create` | 创建分类 | name | pid, sort |

### 商品管理

| 工具名称 | 描述 | 必需参数 | 可选参数 |
|---------|------|---------|---------|
| `crmeb_product_list` | 获取商品列表 | - | page, limit, cate_id, keyword, stock_min, stock_max |
| `crmeb_product_detail` | 获取商品详情 | id | - |
| `crmeb_product_create` | 创建商品 | name, cate_id, price, stock | image, unit |

### 订单管理

| 工具名称 | 描述 | 必需参数 | 可选参数 |
|---------|------|---------|---------|
| `crmeb_order_list` | 获取订单列表 | - | page, limit, status, keyword |
| `crmeb_order_detail` | 获取订单详情 | order_id | - |
| `crmeb_order_delivery` | 订单发货 | order_id, delivery_type | delivery_name, delivery_id |
| `crmeb_order_express_list` | 获取物流公司列表 | - | - |

### 售后管理

| 工具名称 | 描述 | 必需参数 | 可选参数 |
|---------|------|---------|---------|
| `crmeb_refund_list` | 获取售后列表 | - | page, limit |
| `crmeb_refund_detail` | 获取售后详情 | order_id | - |
| `crmeb_refund_agree` | 同意退款 | order_id | - |
| `crmeb_refund_refuse` | 拒绝退款 | order_id, refuse_reason | - |

### 优惠券管理

| 工具名称 | 描述 | 必需参数 | 可选参数 |
|---------|------|---------|---------|
| `crmeb_coupon_list` | 获取优惠券列表 | - | page, limit |

### 用户管理

| 工具名称 | 描述 | 必需参数 | 可选参数 |
|---------|------|---------|---------|
| `crmeb_user_list` | 获取用户列表 | - | page, limit, keyword |
| `crmeb_user_detail` | 获取用户详情 | uid | - |
| `crmeb_user_give_balance` | 赠送余额 | uid, balance | title |
| `crmeb_user_give_point` | 赠送积分 | uid, point | title |

## 使用示例

在 Claude 或 Cursor 中，您可以这样使用：

```
帮我查询 CRMEB 中的商品列表
```

```
创建一个新商品：名称"测试商品"，分类ID 1，价格 99.00，库存 100
```

```
查询订单号 202403130001 的详情
```

```
给用户 ID 为 1 的用户赠送 100 积分
```

## 接口测试

```bash
# 测试 MCP 初始化
curl -X POST "http://localhost:8011/outapi/mcp" \
  -H "Content-Type: application/json" \
  -H "account: your_account" \
  -H "password: your_password" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# 获取工具列表
curl -X POST "http://localhost:8011/outapi/mcp" \
  -H "Content-Type: application/json" \
  -H "account: your_account" \
  -H "password: your_password" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# 调用工具 - 获取商品列表
curl -X POST "http://localhost:8011/outapi/mcp" \
  -H "Content-Type: application/json" \
  -H "account: your_account" \
  -H "password: your_password" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"crmeb_product_list","arguments":{"page":1,"limit":10}}}'

# 调用工具 - 创建分类
curl -X POST "http://localhost:8011/outapi/mcp" \
  -H "Content-Type: application/json" \
  -H "account: your_account" \
  -H "password: your_password" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"crmeb_category_create","arguments":{"name":"新分类","sort":100}}}'

# 调用工具 - 查询库存大于500的商品
curl -X POST "http://localhost:8011/outapi/mcp" \
  -H "Content-Type: application/json" \
  -H "account: your_account" \
  -H "password: your_password" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"crmeb_product_list","arguments":{"stock_min":500}}}'

# 使用演示环境测试
curl -X POST "https://v5.crmeb.net/outapi/mcp" \
  -H "Content-Type: application/json" \
  -H "account: ceshi" \
  -H "password: ceshiceshi" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"crmeb_category_list","arguments":{}}}'
```

## 项目结构

```
crmeb/app/outapi/
├── controller/
│   ├── Mcp.php              # MCP 控制器
│   ├── Login.php            # 认证控制器
│   ├── StoreProduct.php     # 商品控制器
│   ├── StoreCategory.php    # 分类控制器
│   ├── StoreOrder.php       # 订单控制器
│   ├── RefundOrder.php      # 售后控制器
│   ├── StoreCoupon.php      # 优惠券控制器
│   ├── User.php             # 用户控制器
│   └── ...
├── route/
│   └── route.php            # 路由配置
├── middleware/
│   └── AuthTokenMiddleware.php
├── mcp.md                   # 本文档
└── README.md                # outapi 模块说明
```

## 协议说明

### MCP 协议版本

- 支持版本：`2024-11-05`

### JSON-RPC 2.0 格式

**请求格式：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "工具名称",
    "arguments": { "参数": "值" }
  }
}
```

**成功响应：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{...结果数据...}"
      }
    ]
  }
}
```

**错误响应：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "错误信息"
  }
}
```

## 错误码说明

| 错误码 | 说明 |
|-------|------|
| -32700 | JSON 解析错误 |
| -32600 | 请求无效（认证失败等） |
| -32601 | 方法不存在 |
| -32603 | 内部错误 |

## 相关链接

- [Model Context Protocol 文档](https://modelcontextprotocol.io/)
- [CRMEB 开放接口](./README.md)
