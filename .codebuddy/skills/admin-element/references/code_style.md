# 管理端前端代码规范文档

## 1. 概述

本文档描述了 CRMEB 项目中管理端前端的代码规范，包括命名规范、代码风格、文件结构、组件开发等方面的规范，旨在统一代码风格，提高代码质量和可维护性。

## 2. 命名规范

### 2.1 目录命名
- **目录名**: 小写字母，单词之间用连字符分隔
  - **示例**: `components/common/`、`pages/user-management/`、`utils/`
- **规范**: 简洁明了，反映目录的功能

### 2.2 文件命名
- **组件文件**: 大写字母开头的 PascalCase 命名风格
  - **示例**: `Button.vue`、`UserList.vue`、`Navbar.vue`
- **页面文件**: 小写字母，单词之间用连字符分隔
  - **示例**: `login.vue`、`user-list.vue`、`dashboard.vue`
- **JS 文件**: 小写字母，单词之间用连字符分隔
  - **示例**: `api.js`、`request.js`、`util.js`
- **CSS/SCSS 文件**: 小写字母，单词之间用连字符分隔
  - **示例**: `common.scss`、`theme.scss`、`variables.scss`

### 2.3 变量命名
- **普通变量**: 驼峰命名法
  - **示例**: `userInfo`、`goodsList`、`isLoading`
- **常量**: 全大写，单词之间用下划线分隔
  - **示例**: `BASE_URL`、`MAX_COUNT`、`DEFAULT_PAGE_SIZE`
- **布尔变量**: 以 `is` 开头的驼峰命名法
  - **示例**: `isShow`、`isLoading`、`isLogin`
- **数组变量**: 以复数形式命名
  - **示例**: `users`、`goods`、`orders`
- **对象变量**: 以单数形式命名
  - **示例**: `user`、`good`、`order`

### 2.4 函数命名
- **函数名**: 驼峰命名法，动词开头
  - **示例**: `getUserInfo`、`submitForm`、`handleClick`
- **方法名**: 驼峰命名法
  - **示例**: `data`、`methods`、`computed`、`watch`
- **生命周期函数**: 按照 Vue 规范命名
  - **示例**: `created`、`mounted`、`beforeDestroy`
- **事件处理函数**: 以 `handle` 开头
  - **示例**: `handleSubmit`、`handleClick`、`handleChange`

### 2.5 组件命名
- **组件名**: PascalCase 命名风格
  - **示例**: `Button`、`UserList`、`Navbar`
- **组件标签**: 小写字母，单词之间用连字符分隔
  - **示例**: `<el-button>`、`<user-list>`、`<nav-bar>`
- **组件文件名**: 与组件名一致，PascalCase 命名
  - **示例**: `Button.vue`、`UserList.vue`、`Navbar.vue`

### 2.6 其他命名
- **路由命名**: 小写字母，单词之间用连字符分隔
  - **示例**: `/login`、`/user/list`、`/dashboard`
- **CSS 类名**: 小写字母，单词之间用连字符分隔
  - **示例**: `.user-info`、`.goods-list`、`.btn-primary`
- **ID 命名**: 小写字母，单词之间用连字符分隔
  - **示例**: `#app`、`#header`、`#footer`
- **Vuex 模块命名**: 小写字母，单词之间用连字符分隔
  - **示例**: `user`、`goods`、`orders`

## 3. 代码风格

### 3.1 缩进
- **缩进方式**: 4 个空格
- **示例**:
  ```vue
  <template>
      <div class="container">
          <h1>{{ title }}</h1>
      </div>
  </template>
  ```

### 3.2 换行
- **标签换行**: 多个属性的标签应该换行
- **示例**:
  ```vue
  <el-button
      type="primary"
      size="medium"
      @click="handleSubmit"
  >
      提交
  </el-button>
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
- **冒号空格**: 对象字面量中冒号后面应该有空格
  - **示例**: `{ name: '张三', age: 18 }`

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
- **组件注释**: 组件使用文档注释
  - **示例**:
    ```vue
    /**
     * 用户列表组件
     * @props {Array} users - 用户列表数据
     * @props {Boolean} loading - 是否加载中
     * @events {Function} select - 选择用户时触发
     */
    ```

### 3.5 引号
- **字符串**: 使用单引号 `''`
  - **示例**: `const name = '张三'`、`<span>Hello</span>`
- **模板字符串**: 使用反引号 `` ` ``
  - **示例**: `` const url = `${baseUrl}/api/user` ``
- **HTML 属性**: 使用双引号 `""`
  - **示例**: `<div class="container">`、`<img src="https://example.com/img.jpg">`

### 3.6 分号
- **语句结束**: 每个语句结束都应该加分号
  - **示例**: `const name = '张三';`、`function() {};`

### 3.7 空行
- **代码块之间**: 代码块之间应该有空行
  - **示例**:
    ```javascript
    function first() {
        // 代码
    }

    function second() {
        // 代码
    }
    ```
- **逻辑块之间**: 逻辑块之间应该有空行
  - **示例**:
    ```javascript
    if (condition) {
        // 代码
    }

    while (loop) {
        // 代码
    }
    ```

## 4. 文件结构

### 4.1 组件文件结构
```vue
<template>
    <!-- 模板内容 -->
</template>

<script>
// 导入依赖
import { mapState, mapActions } from 'vuex';
import UserApi from '@/api/user';

// 导出组件
export default {
    // 组件名称
    name: 'UserList',
    
    // 组件属性
    props: {
        pageSize: {
            type: Number,
            default: 10
        }
    },
    
    // 数据
    data() {
        return {
            users: [],
            loading: false,
            currentPage: 1,
            total: 0
        };
    },
    
    // 计算属性
    computed: {
        ...mapState('user', ['userInfo']),
        
        // 计算总页数
        totalPages() {
            return Math.ceil(this.total / this.pageSize);
        }
    },
    
    // 监听
    watch: {
        currentPage: {
            handler(newPage) {
                this.getUserList(newPage);
            }
        }
    },
    
    // 生命周期函数
    created() {
        this.getUserList();
    },
    
    // 方法
    methods: {
        // 从 Vuex 映射的方法
        ...mapActions('user', ['setUserInfo']),
        
        // 获取用户列表
        async getUserList(page = 1) {
            try {
                this.loading = true;
                const res = await UserApi.getList({
                    page,
                    pageSize: this.pageSize
                });
                this.users = res.data;
                this.total = res.total;
            } catch (error) {
                console.error('获取用户列表失败:', error);
            } finally {
                this.loading = false;
            }
        },
        
        // 选择用户
        handleSelect(user) {
            this.$emit('select', user);
        }
    }
};
</script>

<style scoped>
.user-list {
    padding: 20px;
}

.user-item {
    margin-bottom: 10px;
    padding: 15px;
    border: 1px solid #eaeaea;
    border-radius: 4px;
}

.user-name {
    font-weight: bold;
    margin-bottom: 5px;
}

.user-email {
    color: #666;
    font-size: 14px;
}
</style>
```

### 4.2 页面文件结构
```vue
<template>
    <div class="user-management">
        <el-card>
            <template slot="header">
                <div class="card-header">
                    <span>用户管理</span>
                    <el-button type="primary" @click="handleAdd">添加用户</el-button>
                </div>
            </template>
            
            <el-form :inline="true" :model="searchForm" class="search-form">
                <el-form-item label="用户名">
                    <el-input v-model="searchForm.username" placeholder="请输入用户名"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleSearch">搜索</el-button>
                    <el-button @click="resetForm">重置</el-button>
                </el-form-item>
            </el-form>
            
            <el-table :data="users" style="width: 100%">
                <el-table-column prop="id" label="ID" width="80"></el-table-column>
                <el-table-column prop="username" label="用户名"></el-table-column>
                <el-table-column prop="email" label="邮箱"></el-table-column>
                <el-table-column prop="created_at" label="创建时间"></el-table-column>
                <el-table-column label="操作" width="150">
                    <template slot-scope="scope">
                        <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
                        <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            
            <div class="pagination">
                <el-pagination
                    v-model="currentPage"
                    :page-size="pageSize"
                    :total="total"
                    layout="total, prev, pager, next, jumper"
                    @size-change="handleSizeChange"
                    @current-change="handleCurrentChange"
                ></el-pagination>
            </div>
        </el-card>
        
        <!-- 添加/编辑对话框 -->
        <el-dialog
            :title="dialogTitle"
            :visible.sync="dialogVisible"
            width="500px"
        >
            <el-form :model="form" :rules="rules" ref="form">
                <el-form-item label="用户名" prop="username">
                    <el-input v-model="form.username"></el-input>
                </el-form-item>
                <el-form-item label="邮箱" prop="email">
                    <el-input v-model="form.email"></el-input>
                </el-form-item>
                <el-form-item label="密码" v-if="!form.id">
                    <el-input v-model="form.password" type="password"></el-input>
                </el-form-item>
            </el-form>
            <span slot="footer" class="dialog-footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="handleSubmit">确定</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
import UserApi from '@/api/user';

export default {
    name: 'UserManagement',
    
    data() {
        return {
            // 搜索表单
            searchForm: {
                username: ''
            },
            // 用户列表
            users: [],
            // 分页信息
            currentPage: 1,
            pageSize: 10,
            total: 0,
            // 对话框
            dialogVisible: false,
            dialogTitle: '',
            form: {},
            // 表单验证规则
            rules: {
                username: [
                    { required: true, message: '请输入用户名', trigger: 'blur' }
                ],
                email: [
                    { required: true, message: '请输入邮箱', trigger: 'blur' },
                    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
                ]
            }
        };
    },
    
    created() {
        this.getUserList();
    },
    
    methods: {
        // 获取用户列表
        async getUserList() {
            try {
                const res = await UserApi.getList({
                    page: this.currentPage,
                    pageSize: this.pageSize,
                    username: this.searchForm.username
                });
                this.users = res.data;
                this.total = res.total;
            } catch (error) {
                console.error('获取用户列表失败:', error);
            }
        },
        
        // 搜索
        handleSearch() {
            this.currentPage = 1;
            this.getUserList();
        },
        
        // 重置表单
        resetForm() {
            this.searchForm = {
                username: ''
            };
            this.currentPage = 1;
            this.getUserList();
        },
        
        // 分页大小变化
        handleSizeChange(size) {
            this.pageSize = size;
            this.getUserList();
        },
        
        // 当前页变化
        handleCurrentChange(current) {
            this.currentPage = current;
            this.getUserList();
        },
        
        // 添加用户
        handleAdd() {
            this.dialogTitle = '添加用户';
            this.form = {};
            this.dialogVisible = true;
        },
        
        // 编辑用户
        handleEdit(user) {
            this.dialogTitle = '编辑用户';
            this.form = { ...user };
            this.dialogVisible = true;
        },
        
        // 删除用户
        handleDelete(id) {
            this.$confirm('确定要删除这个用户吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                try {
                    await UserApi.delete(id);
                    this.$message({
                        type: 'success',
                        message: '删除成功'
                    });
                    this.getUserList();
                } catch (error) {
                    console.error('删除用户失败:', error);
                }
            });
        },
        
        // 提交表单
        async handleSubmit() {
            try {
                await this.$refs.form.validate();
                if (this.form.id) {
                    // 编辑
                    await UserApi.update(this.form.id, this.form);
                    this.$message({
                        type: 'success',
                        message: '更新成功'
                    });
                } else {
                    // 添加
                    await UserApi.create(this.form);
                    this.$message({
                        type: 'success',
                        message: '添加成功'
                    });
                }
                this.dialogVisible = false;
                this.getUserList();
            } catch (error) {
                console.error('提交失败:', error);
            }
        }
    }
};
</script>

<style scoped>
.user-management {
    padding: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.search-form {
    margin-bottom: 20px;
}

.pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
}
</style>
```

### 4.3 JS 文件结构
```javascript
// 导入依赖
import axios from 'axios';
import { Message } from 'element-ui';

// 常量定义
const BASE_URL = process.env.VUE_APP_API_BASE_URL;
const TIMEOUT = 10000;

// 创建 axios 实例
const service = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT
});

// 请求拦截器
service.interceptors.request.use(
    config => {
        // 添加 token
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        console.error('请求错误:', error);
        return Promise.reject(error);
    }
);

// 响应拦截器
service.interceptors.response.use(
    response => {
        const { data } = response;
        if (data.code !== 200) {
            Message.error(data.message || '请求失败');
            return Promise.reject(data);
        }
        return data;
    },
    error => {
        console.error('响应错误:', error);
        Message.error('网络错误，请稍后重试');
        return Promise.reject(error);
    }
);

// 工具函数
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleString();
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 导出
export {
    service,
    formatDate,
    deepClone
};

// 默认导出
export default service;
```

## 5. 组件开发规范

### 5.1 组件设计
- **单一职责**: 每个组件只负责一个功能
- **可复用性**: 设计通用的、可复用的组件
- **可配置性**: 通过 props 提供配置选项
- **事件通信**: 通过事件与父组件通信
- **插槽支持**: 提供插槽，增强组件灵活性

### 5.2 组件使用
- **组件导入**: 使用 import 导入组件
  - **示例**: `import Button from '@/components/Button.vue'`
- **组件注册**: 在 components 中注册组件
  - **示例**: 
    ```javascript
    components: {
        Button
    }
    ```
- **组件使用**: 使用组件标签
  - **示例**: `<Button type="primary">点击</Button>`
- **组件传值**: 通过 props 传递数据
  - **示例**: `<UserList :users="userList" :loading="loading" />`
- **事件监听**: 监听组件事件
  - **示例**: `<UserList @select="handleSelect" />`

### 5.3 组件通信
- **props 向下传递**: 父组件通过 props 向子组件传递数据
- **events 向上传递**: 子组件通过 events 向父组件传递事件
- **refs 引用**: 通过 refs 引用子组件实例
- **provide/inject**: 祖先组件向后代组件传递数据
- **Vuex 全局状态**: 使用 Vuex 管理全局状态
- **EventBus**: 组件间事件总线

### 5.4 组件生命周期
- **created**: 初始化数据，发送请求
- **mounted**: 操作 DOM，初始化第三方库
- **beforeUpdate**: 更新前的准备工作
- **updated**: 数据更新后的操作
- **beforeDestroy**: 清理定时器，取消订阅
- **destroyed**: 组件销毁后的清理工作

### 5.5 组件命名规范
- **组件名**: PascalCase 命名风格
- **组件文件名**: 与组件名一致
- **组件目录**: 按功能分类存放
- **组件前缀**: 通用组件使用统一前缀

## 6. 页面开发规范

### 6.1 页面结构
- **模板结构**: 清晰明了，层次分明
- **脚本结构**: 按照 Vue 规范组织代码
- **样式结构**: 模块化，可维护
- **布局规范**: 遵循统一的布局规范

### 6.2 数据管理
- **本地数据**: 使用 data 管理组件内部数据
- **计算数据**: 使用 computed 计算衍生数据
- **监听数据**: 使用 watch 监听数据变化
- **全局数据**: 使用 Vuex 管理全局数据

### 6.3 路由管理
- **路由配置**: 在 router 目录中配置路由
- **路由跳转**: 使用 router.push、router.replace 等方法
- **路由参数**: 通过 $route.params 获取路由参数
- **路由守卫**: 使用全局/局部路由守卫

### 6.4 API 调用
- **API 封装**: 统一封装 API 调用
- **异步处理**: 使用 async/await 处理异步请求
- **错误处理**: 使用 try/catch 捕获错误
- **加载状态**: 显示加载状态，提升用户体验

### 6.5 用户体验
- **响应式设计**: 适配不同屏幕尺寸
- **加载状态**: 显示加载中提示
- **错误提示**: 显示错误信息
- **成功提示**: 显示操作成功提示
- **表单验证**: 实时表单验证
- **防抖节流**: 优化频繁触发的事件

## 7. 性能优化

### 7.1 代码优化
- **减少冗余代码**: 避免重复的代码
- **使用计算属性**: 对于复杂的计算，使用 computed
- **使用 v-if 和 v-show 合理**: 根据场景选择合适的指令
- **使用 key**: 在 v-for 中使用 key，提高渲染性能
- **避免频繁更新**: 使用防抖和节流

### 7.2 网络优化
- **合理使用缓存**: 缓存不经常变化的数据
- **减少请求次数**: 合并请求，批量操作
- **使用 CDN**: 静态资源使用 CDN
- **压缩传输**: 使用 gzip 压缩传输数据

### 7.3 构建优化
- **Tree Shaking**: 移除未使用的代码
- **代码分割**: 按路由分割代码
- **懒加载**: 路由懒加载，组件懒加载
- **预加载**: 预加载关键资源

### 7.4 其他优化
- **减少 DOM 节点**: 简化 DOM 结构
- **优化图片**: 使用合适的图片格式和大小
- **使用虚拟列表**: 对于长列表，使用虚拟列表
- **避免内存泄漏**: 及时清理定时器、事件监听器等

## 8. 常见问题

### 8.1 代码风格问题
- **问题**: 代码风格不一致
- **解决方案**: 使用 ESLint 和 Prettier 统一代码风格

### 8.2 性能问题
- **问题**: 页面加载慢，卡顿
- **解决方案**: 优化代码，减少 DOM 操作，使用虚拟列表等

### 8.3 兼容性问题
- **问题**: 在不同浏览器上表现不一致
- **解决方案**: 遵循 Web 标准，使用 polyfill

### 8.4 维护性问题
- **问题**: 代码难以维护
- **解决方案**: 模块化开发，添加注释，遵循代码规范

### 8.5 命名冲突问题
- **问题**: 命名冲突
- **解决方案**: 使用命名空间，避免全局变量

## 9. 参考资源

- [Vue 官方风格指南](https://v2.vuejs.org/v2/style-guide/)
- [Element UI 官方文档](https://element.eleme.io/#/zh-CN)
- [ESLint 官方文档](https://eslint.org/docs/user-guide/)
- [Prettier 官方文档](https://prettier.io/docs/en/)
- [JavaScript 代码规范](https://github.com/airbnb/javascript)
- [CSS 代码规范](https://github.com/airbnb/css)

## 10. 总结

本文档描述了 CRMEB 项目中管理端前端的代码规范，包括命名规范、代码风格、文件结构、组件开发等方面的规范。遵循本文档的规范，可以提高代码的可读性、可维护性和可扩展性，确保项目的质量和稳定性。

代码规范是团队协作的基础，建议开发团队成员严格遵循本文档的规范，共同维护一个高质量的代码库。