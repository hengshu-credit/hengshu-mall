# UniApp 代码规范文档

## 1. 概述

本文档描述了 CRMEB 项目中 UniApp 移动端的代码规范，包括命名规范、代码风格、文件结构、组件开发等，旨在统一代码风格，提高代码质量和可维护性。

## 2. 命名规范

### 2.1 目录命名

- **目录名**: 小写字母，单词之间用下划线分隔
- **示例**: `pages/index/`、`components/common/`、`utils/`
- **规范**: 简洁明了，反映目录的功能

### 2.2 文件命名

- **页面文件**: 小写字母，单词之间用下划线分隔
  - **示例**: `index.vue`、`login.vue`、`user_info.vue`
- **组件文件**: 大写字母开头的 PascalCase 命名风格
  - **示例**: `Button.vue`、`NavBar.vue`、`GoodsList.vue`
- **JS 文件**: 小写字母，单词之间用下划线分隔
  - **示例**: `user.js`、`request.js`、`util.js`
- **CSS/SCSS 文件**: 小写字母，单词之间用下划线分隔
  - **示例**: `common.scss`、`theme.scss`

### 2.3 变量命名

- **普通变量**: 驼峰命名法
  - **示例**: `userInfo`、`goodsList`、`isLoading`
- **常量**: 全大写，单词之间用下划线分隔
  - **示例**: `BASE_URL`、`MAX_COUNT`、`DEFAULT_PAGE_SIZE`
- **布尔变量**: 以 `is` 开头的驼峰命名法
  - **示例**: `isShow`、`isLoading`、`isLogin`

### 2.4 函数命名

- **函数名**: 驼峰命名法，动词开头
  - **示例**: `getUserInfo`、`submitForm`、`handleClick`
- **方法名**: 驼峰命名法
  - **示例**: `data`、`methods`、`computed`、`watch`
- **生命周期函数**: 按照 Vue 规范命名
  - **示例**: `created`、`mounted`、`beforeDestroy`

### 2.5 组件命名

- **组件名**: PascalCase 命名风格
  - **示例**: `Button`、`NavBar`、`GoodsList`
- **组件标签**: 小写字母，单词之间用连字符分隔
  - **示例**: `<my-button>`、`<nav-bar>`、`<goods-list>`

### 2.6 其他命名

- **路由命名**: 小写字母，单词之间用连字符分隔
  - **示例**: `/pages/index/index`、`/pages/user/login`
- **CSS 类名**: 小写字母，单词之间用连字符分隔
  - **示例**: `.user-info`、`.goods-list`、`.btn-primary`
- **ID 命名**: 小写字母，单词之间用连字符分隔
  - **示例**: `#app`、`#header`、`#footer`

## 3. 代码风格

### 3.1 缩进

- **缩进方式**: 4 个空格
- **示例**:
  ```vue
  <template>
      <view class="container">
          <text>{{ message }}</text>
      </view>
  </template>
  ```

### 3.2 换行

- **标签换行**: 多个属性的标签应该换行
- **示例**:
  ```vue
  <view
      class="container"
      :class="{ active: isActive }"
      @click="handleClick"
  >
      <text>{{ message }}</text>
  </view>
  ```
- **代码块换行**: 逻辑代码块应该换行
- **示例**:
  ```javascript
  if (condition) {
      // 代码块
  } else {
      // 代码块
  }
  ```

### 3.3 空格

- **运算符空格**: 运算符两侧应该有空格
  - **示例**: `a + b`、`x = y`、`i < 10`
- **逗号空格**: 逗号后面应该有空格
  - **示例**: `[1, 2, 3]`、`{ name: '张三', age: 18 }`
- **括号空格**: 括号内侧不应该有空格
  - **示例**: `if (condition)`、`function (param)`

### 3.4 注释

- **单行注释**: 使用 `//` 注释
  - **示例**: `// 这是单行注释`
- **多行注释**: 使用 `/* */` 注释
  - **示例**:
    ```javascript
    /*
     * 这是多行注释
     * 第二行
     */
    ```
- **文档注释**: 使用 JSDoc 风格的注释
  - **示例**:
    ```javascript
    /**
     * 获取用户信息
     * @param {number} id - 用户ID
     * @returns {Promise} 用户信息
     */
    async function getUserInfo(id) {
        // 代码
    }
    ```

### 3.5 引号

- **字符串**: 使用单引号 `''`
  - **示例**: `const name = '张三'`、`<text>Hello</text>`
- **模板字符串**: 使用反引号 `` ` ``
  - **示例**: `` const url = `${baseUrl}/api/user` ``
- **HTML 属性**: 使用双引号 `""`
  - **示例**: `<view class="container">`、`<image src="https://example.com/img.jpg">`

## 4. 文件结构

### 4.1 页面文件结构

```vue
<template>
    <!-- 模板内容 -->
</template>

<script>
// 导入依赖
import userApi from '../../api/user';

// 导出组件
export default {
    // 组件名称
    name: 'UserInfo',
    
    // 组件属性
    props: {
        userId: {
            type: Number,
            required: true
        }
    },
    
    // 数据
    data() {
        return {
            userInfo: {},
            loading: false
        };
    },
    
    // 计算属性
    computed: {
        fullName() {
            return this.userInfo.firstName + ' ' + this.userInfo.lastName;
        }
    },
    
    // 监听
    watch: {
        userId: {
            handler(newVal) {
                this.getUserInfo(newVal);
            },
            immediate: true
        }
    },
    
    // 生命周期函数
    created() {
        // 初始化
    },
    
    mounted() {
        // 挂载后
    },
    
    // 方法
    methods: {
        async getUserInfo(id) {
            try {
                this.loading = true;
                const res = await userApi.getUserInfo(id);
                this.userInfo = res.data;
            } catch (error) {
                console.error('获取用户信息失败:', error);
            } finally {
                this.loading = false;
            }
        },
        
        handleEdit() {
            // 编辑用户信息
        }
    }
};
</script>

<style scoped>
/* 样式 */
.user-info {
    padding: 20rpx;
    background-color: #f5f5f5;
}

.name {
    font-size: 32rpx;
    font-weight: bold;
}
</style>
```

### 4.2 组件文件结构

```vue
<template>
    <!-- 模板内容 -->
    <view class="my-button">
        <button
            :class="[type, { disabled }]"
            :disabled="disabled"
            @click="handleClick"
        >
            <slot></slot>
        </button>
    </view>
</template>

<script>
export default {
    name: 'MyButton',
    
    props: {
        type: {
            type: String,
            default: 'primary',
            validator: (value) => {
                return ['primary', 'success', 'warning', 'danger'].includes(value);
            }
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    
    methods: {
        handleClick() {
            if (!this.disabled) {
                this.$emit('click');
            }
        }
    }
};
</script>

<style scoped>
.my-button {
    display: inline-block;
}

button {
    padding: 20rpx 40rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
    border: none;
    outline: none;
    cursor: pointer;
}

.primary {
    background-color: #007aff;
    color: #fff;
}

.success {
    background-color: #4cd964;
    color: #fff;
}

.warning {
    background-color: #ff9500;
    color: #fff;
}

.danger {
    background-color: #ff3b30;
    color: #fff;
}

.disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>
```

### 4.3 JS 文件结构

```javascript
// 导入依赖
import request from './request';

// 常量定义
const BASE_URL = 'https://api.crmeb.net';
const TIMEOUT = 10000;

// 工具函数
function formatTime(time) {
    const date = new Date(time);
    return date.toLocaleString();
}

function getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 导出
export {
    formatTime,
    getRandomNum
};

// 默认导出
export default {
    BASE_URL,
    TIMEOUT
};
```

## 5. 组件开发规范

### 5.1 组件设计

- **单一职责**: 每个组件只负责一个功能
- **可复用性**: 设计通用的、可复用的组件
- **可配置性**: 通过 props 提供配置选项
- **事件通信**: 通过事件与父组件通信

### 5.2 组件使用

- **组件导入**: 使用 import 导入组件
  - **示例**: `import Button from '../../components/Button.vue'`
- **组件注册**: 在 components 中注册组件
  - **示例**: 
    ```javascript
    components: {
        Button
    }
    ```
- **组件使用**: 使用组件标签
  - **示例**: `<Button type="primary">点击</Button>`

### 5.3 组件通信

- **props 向下传递**: 父组件通过 props 向子组件传递数据
- **events 向上传递**: 子组件通过 events 向父组件传递事件
- **refs 引用**: 通过 refs 引用子组件实例
- **provide/inject**: 祖先组件向后代组件传递数据

## 6. 页面开发规范

### 6.1 页面结构

- **模板结构**: 清晰明了，层次分明
- **脚本结构**: 按照 Vue 规范组织代码
- **样式结构**: 模块化，可维护

### 6.2 数据管理

- **本地数据**: 使用 data 管理组件内部数据
- **计算数据**: 使用 computed 计算衍生数据
- **监听数据**: 使用 watch 监听数据变化
- **全局数据**: 使用 Vuex 管理全局数据

### 6.3 生命周期管理

- **created**: 初始化数据，发送请求
- **mounted**: 操作 DOM，初始化第三方库
- **beforeDestroy**: 清理定时器，取消订阅

### 6.4 路由管理

- **路由配置**: 在 pages.json 中配置路由
- **路由跳转**: 使用 uni.navigateTo、uni.redirectTo 等方法
- **路由参数**: 通过 options 或 $route.params 获取路由参数

## 7. API 调用规范

### 7.1 API 封装

- **模块化**: 按业务模块封装 API
- **统一处理**: 统一处理请求头、响应拦截、错误处理
- **Promise 化**: 使用 Promise 处理异步请求

### 7.2 API 调用

- **异步处理**: 使用 async/await 处理异步请求
- **错误处理**: 使用 try/catch 捕获错误
- **加载状态**: 显示加载状态，提升用户体验
- **错误提示**: 统一处理错误提示

### 7.3 示例代码

```javascript
async function getUserInfo() {
    try {
        this.loading = true;
        const res = await userApi.getUserInfo();
        this.userInfo = res.data;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        uni.showToast({
            title: '获取用户信息失败',
            icon: 'none'
        });
    } finally {
        this.loading = false;
    }
}
```

## 8. 性能优化

### 8.1 代码优化

- **减少冗余代码**: 避免重复的代码
- **使用计算属性**: 对于复杂的计算，使用 computed
- **使用 v-if 和 v-show 合理**: 根据场景选择合适的指令
- **使用 key**: 在 v-for 中使用 key，提高渲染性能

### 8.2 网络优化

- **合理使用缓存**: 缓存不经常变化的数据
- **减少请求次数**: 合并请求，批量操作
- **使用防抖和节流**: 避免频繁的事件触发
- **延迟加载**: 对于非首屏内容，使用延迟加载

### 8.3 其他优化

- **减少 DOM 节点**: 简化 DOM 结构
- **优化图片**: 使用合适的图片格式和大小
- **使用虚拟列表**: 对于长列表，使用虚拟列表
- **避免内存泄漏**: 及时清理定时器、事件监听器等

## 9. 常见问题

### 9.1 代码风格问题

- **问题**: 代码风格不一致
- **解决方案**: 使用 ESLint 等工具进行代码检查

### 9.2 性能问题

- **问题**: 页面加载慢，卡顿
- **解决方案**: 优化代码，减少 DOM 操作，使用虚拟列表等

### 9.3 兼容性问题

- **问题**: 在不同平台上表现不一致
- **解决方案**: 遵循 UniApp 规范，使用条件编译

### 9.4 维护性问题

- **问题**: 代码难以维护
- **解决方案**: 模块化开发，添加注释，遵循代码规范

## 10. 参考资源

- [Vue 官方文档](https://cn.vuejs.org/)
- [UniApp 官方文档](https://uniapp.dcloud.io/)
- [ESLint 官方文档](https://eslint.org/docs/user-guide/)
- [Prettier 官方文档](https://prettier.io/docs/en/)
- [前端代码规范指南](https://github.com/ecomfe/spec)

## 11. 总结

本文档描述了 CRMEB 项目中 UniApp 移动端的代码规范，包括命名规范、代码风格、文件结构、组件开发等。遵循本文档的规范，可以提高代码的可读性、可维护性和可扩展性，确保项目的质量和稳定性。

代码规范是团队协作的基础，建议开发团队成员严格遵循本文档的规范，共同维护一个高质量的代码库。