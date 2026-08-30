<template>
  <div class="routine-ci-upload">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <i class="el-icon-upload"></i>
        </div>
        <div class="header-text">
          <h1>小程序一键上传</h1>
          <p>使用 miniprogram-ci 自动化部署小程序代码到微信服务器</p>
        </div>
      </div>
    </div>

    <!-- 进度指示器 -->
    <div class="progress-steps">
      <div class="step" :class="{ active: true, completed: envStatus.ready }">
        <div class="step-number">1</div>
        <div class="step-label">环境配置</div>
      </div>
      <div class="step-line" :class="{ completed: envStatus.ready }"></div>
      <div class="step"
        :class="{ active: envStatus.ready, completed: uploadConfig.app_id_configured && uploadConfig.private_key_exists }">
        <div class="step-number">2</div>
        <div class="step-label">上传配置</div>
      </div>
      <div class="step-line" :class="{ completed: uploadConfig.app_id_configured && uploadConfig.private_key_exists }">
      </div>
      <div class="step"
        :class="{ active: envStatus.ready && uploadConfig.app_id_configured && uploadConfig.private_key_exists }">
        <div class="step-number">3</div>
        <div class="step-label">上传代码</div>
      </div>
    </div>

    <!-- 使用须知 - 可折叠 -->
    <div class="notice-banner" :class="{ expanded: showNotice }">
      <div class="notice-header" @click="showNotice = !showNotice">
        <div class="notice-title">
          <i class="el-icon-info"></i>
          <span>使用前准备</span>
        </div>
        <i :class="showNotice ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
      </div>
      <transition name="slide-fade">
        <div v-show="showNotice" class="notice-content">
          <div class="notice-item">
            <div class="notice-step">1</div>
            <div class="notice-text">
              <strong>生成代码上传密钥</strong>
              <p>访问 <a href="https://mp.weixin.qq.com/" target="_blank" rel="noopener">微信公众平台</a> → 开发管理 → 开发设置 →
                小程序代码上传 → 生成密钥</p>
            </div>
          </div>
          <div class="notice-item">
            <div class="notice-step">2</div>
            <div class="notice-text">
              <strong>配置 IP 白名单</strong>
              <p>在同一页面将服务器公网 IP 添加到白名单中</p>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 环境状态卡片 -->
      <div class="card env-card" :class="{ 'card-success': envStatus.ready, 'card-warning': !envStatus.ready }">
        <div class="card-header">
          <div class="card-title">
            <i class="el-icon-cpu"></i>
            <span>运行环境</span>
          </div>
          <button class="refresh-btn" @click="checkEnvironment" :disabled="loading.environment">
            <i :class="loading.environment ? 'el-icon-loading' : 'el-icon-refresh'"></i>
          </button>
        </div>

        <div class="card-body" v-loading="loading.environment">
          <!-- 环境状态概览 -->
          <div class="status-overview">
            <div class="status-badge" :class="envStatus.ready ? 'success' : 'warning'">
              <i :class="envStatus.ready ? 'el-icon-check' : 'el-icon-warning'"></i>
              {{ envStatus.ready ? '环境就绪' : '环境未就绪' }}
            </div>
          </div>

          <!-- 环境详情 -->
          <div class="env-grid">
            <div class="env-item">
              <div class="env-icon os">
                <i class="el-icon-monitor"></i>
              </div>
              <div class="env-info">
                <span class="env-label">操作系统</span>
                <span class="env-value">{{ envStatus.os?.type || '-' }} {{ envStatus.os?.version || '' }}</span>
              </div>
            </div>
            <div class="env-item">
              <div class="env-icon" :class="envStatus.node?.installed ? 'success' : 'error'">
                <i class="el-icon-connection"></i>
              </div>
              <div class="env-info">
                <span class="env-label">Node.js</span>
                <span class="env-value" :class="envStatus.node?.installed ? 'text-success' : 'text-error'">
                  {{ envStatus.node?.installed ? 'v' + envStatus.node.version : '未安装' }}
                </span>
              </div>
            </div>
            <div class="env-item">
              <div class="env-icon" :class="envStatus.miniprogram_ci?.installed ? 'success' : 'error'">
                <i class="el-icon-box"></i>
              </div>
              <div class="env-info">
                <span class="env-label">miniprogram-ci</span>
                <span class="env-value" :class="envStatus.miniprogram_ci?.installed ? 'text-success' : 'text-error'">
                  {{ envStatus.miniprogram_ci?.installed ? 'v' + envStatus.miniprogram_ci.version : '未安装' }}
                </span>
              </div>
            </div>
          </div>

          <!-- exec 被禁用的警告 -->
          <div v-if="envStatus.exec_enabled === false" class="alert alert-error">
            <i class="el-icon-warning"></i>
            <div class="alert-content">
              <strong>无法使用小程序上传功能</strong>
              <p>服务器禁用了 <code>exec</code> 函数。请在 PHP 配置中启用该函数。</p>
              <p class="alert-hint">宝塔面板：软件商店 → PHP → 设置 → 禁用函数 → 删除 exec</p>
            </div>
          </div>

          <!-- 安装按钮 -->
          <div v-if="!envStatus.ready && envStatus.exec_enabled !== false" class="action-buttons">

            <button class="btn btn-secondary" @click="showGuide = true">
              <i class="el-icon-document"></i>
              <span>手动安装指南</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 上传配置卡片 -->
      <div v-if="envStatus.ready" class="card config-card">
        <div class="card-header">
          <div class="card-title">
            <i class="el-icon-setting"></i>
            <span>上传配置</span>
          </div>
        </div>

        <div class="card-body">
          <div class="config-grid">
            <!-- AppId 配置 -->
            <div class="config-item">
              <div class="config-icon">
                <i class="el-icon-key"></i>
              </div>
              <div class="config-info">
                <span class="config-label">小程序 AppId</span>
                <div class="config-value">
                  <template v-if="uploadConfig.app_id_configured">
                    <span class="value-text">{{ uploadConfig.app_id }}</span>
                    <span class="status-dot success"></span>
                  </template>
                  <template v-else>
                    <span class="value-text text-muted">未配置</span>
                    <router-link :to="{ path: $routeProStr + '/setting/routine_config/2/7' }" class="config-link">
                      去配置 <i class="el-icon-arrow-right"></i>
                    </router-link>
                  </template>
                </div>
              </div>
            </div>

            <!-- 上传密钥配置 -->
            <div class="config-item">
              <div class="config-icon">
                <i class="el-icon-lock"></i>
              </div>
              <div class="config-info">
                <span class="config-label">上传密钥</span>
                <div class="config-value">
                  <template v-if="uploadConfig.private_key_exists">
                    <span class="value-text">已配置</span>
                    <span class="status-dot success"></span>
                    <button class="link-btn" @click="showKeyUpload = true">重新上传</button>
                  </template>
                  <template v-else>
                    <span class="value-text text-muted">未配置</span>
                    <button class="btn btn-sm btn-primary" @click="showKeyUpload = true">
                      <i class="el-icon-upload2"></i> 上传密钥
                    </button>
                  </template>
                </div>
              </div>
              <div class="config-hint">
                <a href="https://mp.weixin.qq.com/" target="_blank" rel="noopener">前往微信公众平台获取</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 一键上传卡片 -->
      <div v-if="envStatus.ready && uploadConfig.app_id_configured && uploadConfig.private_key_exists" class="card upload-card">
        <div class="card-header">
          <div class="card-title">
            <i class="el-icon-upload"></i>
            <span>一键上传</span>
          </div>
          <span class="badge badge-success">无需开发者工具</span>
        </div>

        <div class="card-body">
          <!-- 提示信息 -->
          <div class="info-banner">
            <i class="el-icon-info"></i>
            <span>系统将自动生成小程序代码包并上传到微信服务器</span>
          </div>

          <!-- 上传表单 -->
          <el-form :model="uploadForm" :rules="uploadRules" ref="uploadForm" class="upload-form" label-position="top">
            <div class="form-row">
              <el-form-item label="版本号" prop="version" class="form-item-half">
                <el-input v-model="uploadForm.version" placeholder="例如：1.0.0" prefix-icon="el-icon-price-tag">
                </el-input>
              </el-form-item>

              <el-form-item label="直播功能" class="form-item-half">
                <!-- <el-radio-group v-model="uploadForm.is_live" class="radio-group-custom">
                  <el-radio-button :label="0">未开通</el-radio-button>
                  <el-radio-button :label="1">已开通</el-radio-button>
                </el-radio-group> -->
                <el-switch v-model="uploadForm.is_live" :active-value="1" :inactive-value="0" class="defineSwitch"
                  size="large" width=200 active-text="已开通" inactive-text="未开通" />
              </el-form-item>
            </div>

            <el-form-item label="版本描述">
              <el-input v-model="uploadForm.desc" type="textarea" :rows="3" placeholder="简要描述本次更新内容（可选）">
              </el-input>
            </el-form-item>

            <div class="form-actions">
              <button type="button" class="btn btn-primary btn-lg" :class="{ loading: loading.upload }"
                :disabled="loading.upload" @click="handleUpload">
                <i :class="loading.upload ? 'el-icon-loading' : 'el-icon-upload2'"></i>
                <span>上传到微信</span>
              </button>
              <button type="button" class="btn btn-outline btn-lg" :class="{ loading: loading.preview }"
                :disabled="loading.preview" @click="handlePreview">
                <i :class="loading.preview ? 'el-icon-loading' : 'el-icon-mobile-phone'"></i>
                <span>获取预览码</span>
              </button>
            </div>
          </el-form>

          <!-- 预览二维码 -->
          <transition name="fade-slide">
            <div v-if="previewQrcode" class="preview-section">
              <div class="preview-card">
                <img :src="previewQrcode" alt="预览二维码" />
                <p>使用微信扫码预览</p>
              </div>
            </div>
          </transition>

          <!-- 上传结果 -->
          <transition name="fade-slide">
            <div v-if="uploadResult" class="result-section">
              <div class="result-card" :class="uploadResult.success ? 'success' : 'error'">
                <div class="result-icon">
                  <i :class="uploadResult.success ? 'el-icon-check' : 'el-icon-close'"></i>
                </div>
                <div class="result-content">
                  <h4>{{ uploadResult.success ? '上传成功' : '上传失败' }}</h4>
                  <p v-if="uploadResult.success">版本 {{ uploadResult.version }} 已上传到微信服务器</p>
                  <p v-if="uploadResult.success">
                    请前往 <a href="https://mp.weixin.qq.com/" target="_blank" rel="noopener">微信公众平台</a> 提交审核
                  </p>
                  <p v-else class="error-msg">{{ uploadResult.message }}</p>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 手动安装指南弹窗 -->
    <el-dialog title="手动安装指南" :visible.sync="showGuide" width="650px" custom-class="custom-dialog">
      <div v-if="installGuide" class="install-guide">
        <!-- 一键安装脚本 -->
        <div v-if="installGuide.script_url" class="guide-section recommended">
          <div class="section-badge">
            <i class="el-icon-star-on"></i>
            <span>推荐方式</span>
          </div>
          <div class="section-header">
            <div class="header-icon">
              <i class="el-icon-magic-stick"></i>
            </div>
            <div class="header-text">
              <h3>一键自动安装</h3>
              <p>最简单的方式，自动完成所有配置</p>
            </div>
          </div>
          <div class="install-instruction">
            <span class="instruction-label">在服务器终端执行：</span>
          </div>
          <div class="code-block">
            <div class="code-content">
              <span class="code-prompt">$</span>
              <code>curl -fsSL {{ installGuide.script_url }} | bash</code>
            </div>
            <button class="copy-btn" @click="copyToClipboard(`curl -fsSL ${installGuide.script_url} | bash`)"
              title="复制命令">
              <i class="el-icon-document-copy"></i>
              <span class="copy-text">复制</span>
            </button>
          </div>
          <div class="section-footer">
            <i class="el-icon-download"></i>
            <span>或 <a :href="installGuide.script_url" target="_blank" rel="noopener">下载脚本文件</a> 后手动执行</span>
          </div>
        </div>

        <div class="divider-section">
          <div class="divider-line"></div>
          <span class="divider-text">或者手动安装</span>
          <div class="divider-line"></div>
        </div>

        <div class="guide-section manual">
          <div class="section-header">
            <div class="header-icon manual-icon">
              <i class="el-icon-document"></i>
            </div>
            <div class="header-text">
              <h3>{{ installGuide.title || '手动安装步骤' }}</h3>
              <p>按照以下步骤逐一执行</p>
            </div>
          </div>
          <div class="guide-steps">
            <div v-for="(step, index) in installGuide.steps" :key="index" class="step-item">
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-content">
                <code>{{ step }}</code>
              </div>
              <button class="step-copy-btn" @click="copyToClipboard(step)" title="复制">
                <i class="el-icon-document-copy"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <span slot="footer">
        <button class="btn btn-secondary" @click="showGuide = false">关闭</button>
      </span>
    </el-dialog>

    <!-- 上传密钥弹窗 -->
    <el-dialog title="上传代码上传密钥" :visible.sync="showKeyUpload" width="650px" custom-class="custom-dialog">
      <div class="key-upload-content">
        <div class="info-card">
          <div class="info-card-header">
            <i class="el-icon-info"></i>
            <span>密钥获取方式</span>
          </div>
          <ol class="info-steps">
            <li>登录 <a href="https://mp.weixin.qq.com/" target="_blank" rel="noopener">微信公众平台</a></li>
            <li>进入 开发管理 → 开发设置 → 小程序代码上传</li>
            <li>点击「生成」按钮，下载 private.key 文件</li>
            <li>用文本编辑器打开，复制全部内容粘贴到下方</li>
          </ol>
        </div>

        <div class="info-card warning">
          <div class="info-card-header">
            <i class="el-icon-warning"></i>
            <span>IP 白名单配置</span>
          </div>
          <p>在同一页面将服务器公网 IP 添加到白名单</p>
        </div>

        <div class="key-input-section">
          <label>密钥内容</label>
          <textarea v-model="keyContent" rows="10" placeholder="请粘贴 private.key 文件的完整内容
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----" class="key-textarea">
      </textarea>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <button class="btn btn-secondary" @click="showKeyUpload = false">取消</button>
        <button class="btn btn-primary" :class="{ loading: loading.saveKey }" :disabled="loading.saveKey"
          @click="savePrivateKey">
          <i :class="loading.saveKey ? 'el-icon-loading' : 'el-icon-check'"></i>
          <span>保存密钥</span>
        </button>
      </span>
    </el-dialog>

  </div>
</template>

<script>
import {
  routineCIEnvironment,
  routineCIGuide,
  routineCIConfig,
  routineCISaveKey,
  routineCIUpload,
  routineCIPreview,
} from '@/api/app';

export default {
  name: 'RoutineCIUpload',
  data() {
    return {
      // 页面状态
      showNotice: false,
      envStatus: {},
      uploadConfig: {},
      installGuide: null,

      // 加载状态
      loading: {
        environment: false,
        saveKey: false,
        upload: false,
        preview: false,
      },

      // 弹窗状态
      showGuide: false,
      showKeyUpload: false,

      // 表单数据
      keyContent: '',
      uploadForm: {
        version: '',
        desc: '',
        is_live: 0,
      },
      uploadRules: {
        version: [
          { required: true, message: '请输入版本号', trigger: 'blur' },
          { pattern: /^\d+\.\d+\.\d+$/, message: '版本号格式错误，请使用 x.x.x 格式', trigger: 'blur' },
        ],
      },

      // 结果数据
      previewQrcode: '',
      uploadResult: null,
    };
  },

  mounted() {
    this.checkEnvironment();
  },

  methods: {
    // 复制到剪贴板
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.$message.success('已复制到剪贴板');
      } catch (err) {
        this.$message.error('复制失败');
      }
    },

    // 检查环境
    async checkEnvironment() {
      this.loading.environment = true;
      try {
        const res = await routineCIEnvironment();
        this.envStatus = res.data;

        if (res.data.ready) {
          this.getUploadConfig();
        } else {
          this.getInstallGuide();
        }
      } catch (err) {
        this.$message.error(err.msg || '检查环境失败');
      } finally {
        this.loading.environment = false;
      }
    },

    // 获取上传配置
    async getUploadConfig() {
      try {
        const res = await routineCIConfig();
        this.uploadConfig = res.data;
      } catch (err) {
        console.error('获取上传配置失败', err);
      }
    },

    // 获取安装指南
    async getInstallGuide() {
      try {
        const res = await routineCIGuide();
        this.installGuide = res.data;
      } catch (err) {
        console.error('获取安装指南失败', err);
      }
    },

    // 保存密钥
    async savePrivateKey() {
      if (!this.keyContent.trim()) {
        this.$message.warning('请输入密钥内容');
        return;
      }

      this.loading.saveKey = true;
      try {
        await routineCISaveKey({ key_content: this.keyContent });
        this.$message.success('密钥保存成功');
        this.showKeyUpload = false;
        this.keyContent = '';
        this.getUploadConfig();
      } catch (err) {
        this.$message.error(err.msg || '保存失败');
      } finally {
        this.loading.saveKey = false;
      }
    },

    // 上传代码
    async handleUpload() {
      this.$refs.uploadForm.validate(async (valid) => {
        if (!valid) return;

        try {
          await this.$confirm('确定要上传小程序代码吗？', '确认上传', {
            confirmButtonText: '确定上传',
            cancelButtonText: '取消',
            type: 'info',
          });

          this.loading.upload = true;
          this.uploadResult = null;

          const res = await routineCIUpload(this.uploadForm);

          this.uploadResult = {
            success: true,
            version: this.uploadForm.version,
            message: res.data?.message || '上传成功',
          };

          this.$message.success('上传成功');
        } catch (err) {
          if (err !== 'cancel') {
            this.uploadResult = {
              success: false,
              message: err.msg || '上传失败',
            };
            this.$message.error(err.msg || '上传失败');
          }
        } finally {
          this.loading.upload = false;
        }
      });
    },

    // 获取预览码
    async handlePreview() {
      this.loading.preview = true;
      try {
        const res = await routineCIPreview({});
        this.previewQrcode = res.data.qrcode_url;
        this.$message.success('预览二维码生成成功');
      } catch (err) {
        this.$message.error(err.msg || '获取预览码失败');
      } finally {
        this.loading.preview = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@use 'sass:color';

// ========================================
// 设计系统变量 (SaaS 配色方案)
// ========================================
$primary: #2563EB;
$primary-light: #3B82F6;
$primary-lighter: #DBEAFE;
$secondary: #64748B;
$success: #10B981;
$success-light: #D1FAE5;
$warning: #F59E0B;
$warning-light: #FEF3C7;
$error: #EF4444;
$error-light: #FEE2E2;
$cta: #F97316;

$bg-primary: #F8FAFC;
$bg-card: #FFFFFF;
$text-primary: #1E293B;
$text-secondary: #475569;
$text-muted: #64748B;
$border-color: #E2E8F0;

$radius-sm: 6px;
$radius-md: 10px;
$radius-lg: 16px;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);

$transition-fast: 150ms ease;
$transition-normal: 200ms ease;
$transition-slow: 300ms ease;

// ========================================
// 基础布局
// ========================================
.routine-ci-upload {
  min-height: 100vh;
  background: $bg-primary;
  padding: 24px;

  // 页面头部
  .page-header {
    margin-bottom: 24px;

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, $primary 0%, $primary-light 100%);
      border-radius: $radius-lg;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba($primary, 0.3);

      i {
        font-size: 28px;
        color: white;
      }
    }

    .header-text {
      h1 {
        font-size: 24px;
        font-weight: 700;
        color: $text-primary;
        margin: 0 0 4px 0;
        letter-spacing: -0.5px;
      }

      p {
        font-size: 14px;
        color: $text-muted;
        margin: 0;
      }
    }
  }

  // 进度步骤
  .progress-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin-bottom: 32px;
    padding: 20px;
    background: $bg-card;
    border-radius: $radius-lg;
    box-shadow: $shadow-sm;

    .step {
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0.4;
      transition: all $transition-normal;

      &.active {
        opacity: 1;
      }

      &.completed .step-number {
        background: $success;
        border-color: $success;
      }

      .step-number {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: $bg-primary;
        border: 2px solid $border-color;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
        color: $text-secondary;
        transition: all $transition-normal;
      }

      &.active .step-number {
        background: $primary;
        border-color: $primary;
        color: white;
      }

      .step-label {
        font-size: 14px;
        font-weight: 500;
        color: $text-secondary;
      }
    }

    .step-line {
      width: 60px;
      height: 2px;
      background: $border-color;
      margin: 0 16px;
      transition: background $transition-normal;

      &.completed {
        background: $success;
      }
    }
  }

  // 使用须知横幅
  .notice-banner {
    background: $bg-card;
    border: 1px solid $border-color;
    border-radius: $radius-md;
    margin-bottom: 24px;
    overflow: hidden;

    .notice-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      cursor: pointer;
      transition: background $transition-fast;

      &:hover {
        background: $bg-primary;
      }

      .notice-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        color: $text-primary;

        i {
          color: $warning;
          font-size: 18px;
        }
      }

      >i {
        color: $text-muted;
        transition: transform $transition-normal;
      }
    }

    .notice-content {
      padding: 0 20px 20px;
      border-top: 1px solid $border-color;

      .notice-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 0;
        border-bottom: 1px solid color.adjust($border-color, $lightness: 3%);

        &:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .notice-step {
          width: 24px;
          height: 24px;
          min-width: 24px;
          background: $primary-lighter;
          color: $primary;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
        }

        .notice-text {
          strong {
            display: block;
            font-size: 14px;
            color: $text-primary;
            margin-bottom: 4px;
          }

          p {
            font-size: 13px;
            color: $text-muted;
            margin: 0;
            line-height: 1.5;

            a {
              color: $primary;
              text-decoration: none;
              font-weight: 500;

              &:hover {
                text-decoration: underline;
              }
            }
          }
        }
      }
    }
  }

  // 主内容区域
  .main-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  // 卡片基础样式
  .card {
    background: $bg-card;
    border-radius: $radius-lg;
    box-shadow: $shadow-sm;
    border: 1px solid $border-color;
    overflow: hidden;
    transition: box-shadow $transition-normal, border-color $transition-normal;

    &:hover {
      box-shadow: $shadow-md;
    }

    &.card-success {
      border-color: color.adjust($success, $lightness: 30%);
    }

    &.card-warning {
      border-color: color.adjust($warning, $lightness: 30%);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid $border-color;
      background: linear-gradient(to bottom, $bg-card, $bg-primary);

      .card-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;

        i {
          font-size: 20px;
          color: $primary;
        }
      }

      .refresh-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: $bg-primary;
        border-radius: $radius-sm;
        color: $text-muted;
        cursor: pointer;
        transition: all $transition-fast;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover:not(:disabled) {
          background: $primary-lighter;
          color: $primary;
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
      }
    }

    .card-body {
      padding: 24px;
    }
  }

  // 环境状态卡片
  .env-card {
    .status-overview {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 24px;
        border-radius: 50px;
        font-weight: 600;
        font-size: 14px;

        i {
          font-size: 18px;
        }

        &.success {
          background: $success-light;
          color: color.adjust($success, $lightness: -10%);
        }

        &.warning {
          background: $warning-light;
          color: color.adjust($warning, $lightness: -10%);
        }
      }
    }

    .env-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }

      .env-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: $bg-primary;
        border-radius: $radius-md;
        border: 1px solid transparent;
        transition: all $transition-fast;

        &:hover {
          border-color: $border-color;
        }

        .env-icon {
          width: 44px;
          height: 44px;
          border-radius: $radius-md;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid $border-color;

          i {
            font-size: 20px;
            color: $text-muted;
          }

          &.os i {
            color: $secondary;
          }

          &.success {
            background: $success-light;
            border-color: color.adjust($success, $lightness: 30%);

            i {
              color: $success;
            }
          }

          &.error {
            background: $error-light;
            border-color: color.adjust($error, $lightness: 25%);

            i {
              color: $error;
            }
          }
        }

        .env-info {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .env-label {
            font-size: 12px;
            color: $text-muted;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .env-value {
            font-size: 14px;
            font-weight: 600;
            color: $text-primary;

            &.text-success {
              color: $success;
            }

            &.text-error {
              color: $error;
            }
          }
        }
      }
    }
  }

  // 警告样式
  .alert {
    display: flex;
    gap: 14px;
    padding: 16px 20px;
    border-radius: $radius-md;
    margin-top: 20px;

    >i {
      font-size: 22px;
      flex-shrink: 0;
    }

    &.alert-error {
      background: $error-light;
      border: 1px solid color.adjust($error, $lightness: 25%);

      >i {
        color: $error;
      }
    }

    .alert-content {
      strong {
        display: block;
        font-size: 14px;
        color: $text-primary;
        margin-bottom: 6px;
      }

      p {
        font-size: 13px;
        color: $text-secondary;
        margin: 0 0 4px;
        line-height: 1.5;

        code {
          background: rgba(0, 0, 0, 0.06);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 12px;
        }
      }

      .alert-hint {
        color: $text-muted;
        font-size: 12px;
      }
    }
  }

  // 操作按钮区域
  .action-buttons {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid $border-color;
  }

  // 配置卡片
  .config-card {
    .config-grid {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .config-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px 0;
      border-bottom: 1px solid $border-color;

      &:first-child {
        padding-top: 0;
      }

      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .config-icon {
        width: 40px;
        height: 40px;
        background: $primary-lighter;
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        i {
          font-size: 18px;
          color: $primary;
        }
      }

      .config-info {
        flex: 1;
        min-width: 0;

        .config-label {
          display: block;
          font-size: 12px;
          color: $text-muted;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .config-value {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;

          .value-text {
            font-size: 15px;
            font-weight: 500;
            color: $text-primary;

            &.text-muted {
              color: $text-muted;
            }
          }

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;

            &.success {
              background: $success;
              box-shadow: 0 0 0 3px rgba($success, 0.2);
            }
          }

          .config-link {
            font-size: 13px;
            color: $primary;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }

      .config-hint {
        font-size: 12px;
        color: $text-muted;
        margin-top: 6px;

        a {
          color: $primary;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }

  // 上传卡片
  .upload-card {
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 50px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.badge-success {
        background: $success-light;
        color: color.adjust($success, $lightness: -10%);
      }
    }

    .info-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: $primary-lighter;
      border-radius: $radius-md;
      margin-bottom: 24px;

      i {
        font-size: 18px;
        color: $primary;
      }

      span {
        font-size: 13px;
        color: color.adjust($primary, $lightness: -10%);
      }
    }

    .upload-form {
      .form-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .form-item-half {
        margin-bottom: 0;
      }

      ::v-deep .el-form-item__label {
        font-weight: 500;
        color: $text-primary;
        padding-bottom: 8px;
      }

      ::v-deep .el-input__inner,
      ::v-deep .el-textarea__inner {
        border-radius: $radius-sm;
        border-color: $border-color;
        transition: all $transition-fast;

        &:focus {
          border-color: $primary;
          box-shadow: 0 0 0 3px rgba($primary, 0.1);
        }
      }

      .radio-group-custom {
        ::v-deep .el-radio-button__inner {
          border-radius: $radius-sm;
          border-color: $border-color;
          padding: 10px 20px;
        }

        ::v-deep .el-radio-button__orig-radio:checked+.el-radio-button__inner {
          background: $primary;
          border-color: $primary;
          box-shadow: -1px 0 0 0 $primary;
        }
      }

      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 8px;
      }
    }
  }

  // 预览区域
  .preview-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid $border-color;

    .preview-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px;
      background: $bg-primary;
      border-radius: $radius-md;
      text-align: center;

      img {
        width: 180px;
        height: 180px;
        border-radius: $radius-md;
        box-shadow: $shadow-md;
        margin-bottom: 12px;
      }

      p {
        font-size: 13px;
        color: $text-muted;
        margin: 0;
      }
    }
  }

  // 结果区域
  .result-section {
    margin-top: 24px;

    .result-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px;
      border-radius: $radius-md;

      &.success {
        background: $success-light;
        border: 1px solid color.adjust($success, $lightness: 30%);

        .result-icon {
          background: $success;
        }
      }

      &.error {
        background: $error-light;
        border: 1px solid color.adjust($error, $lightness: 25%);

        .result-icon {
          background: $error;
        }
      }

      .result-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        i {
          font-size: 20px;
          color: white;
        }
      }

      .result-content {
        h4 {
          font-size: 15px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 6px;
        }

        p {
          font-size: 13px;
          color: $text-secondary;
          margin: 0 0 4px;
          line-height: 1.5;

          a {
            color: $primary;
            text-decoration: none;
            font-weight: 500;

            &:hover {
              text-decoration: underline;
            }
          }

          &.error-msg {
            color: $error;
          }
        }
      }
    }
  }
}

// ========================================
// 按钮组件
// ========================================
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: $radius-sm;
  border: none;
  cursor: pointer;
  transition: all $transition-fast;
  text-decoration: none;

  i {
    font-size: 16px;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba($primary, 0.2);
  }

  &.btn-sm {
    padding: 6px 14px;
    font-size: 13px;

    i {
      font-size: 14px;
    }
  }

  &.btn-lg {
    padding: 14px 28px;
    font-size: 15px;

    i {
      font-size: 18px;
    }
  }

  &.btn-primary {
    background: linear-gradient(135deg, $primary 0%, $primary-light 100%);
    color: white;
    box-shadow: 0 2px 8px rgba($primary, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba($primary, 0.4);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }

  &.btn-secondary {
    background: $bg-primary;
    color: $text-secondary;
    border: 1px solid $border-color;

    &:hover:not(:disabled) {
      background: white;
      border-color: color.adjust($border-color, $lightness: -5%);
    }
  }

  &.btn-outline {
    background: transparent;
    color: $text-primary;
    border: 1px solid $border-color;

    &:hover:not(:disabled) {
      background: $bg-primary;
      border-color: color.adjust($border-color, $lightness: -5%);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.loading {
    pointer-events: none;

    i {
      animation: spin 1s linear infinite;
    }
  }
}

.link-btn {
  background: none;
  border: none;
  color: $primary;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;

  &:hover {
    text-decoration: underline;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

// ========================================
// 弹窗样式
// ========================================
::v-deep .custom-dialog {
  border-radius: $radius-lg;
  overflow: hidden;

  .el-dialog__header {
    padding: 20px 24px;
    border-bottom: 1px solid $border-color;
    background: $bg-primary;

    .el-dialog__title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
    }

    .el-dialog__headerbtn {
      top: 20px;
      right: 20px;
    }
  }

  .el-dialog__body {
    padding: 24px;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid $border-color;
    background: $bg-primary;
  }
}

// 安装指南弹窗
.install-guide {
  .guide-section {
    padding: 24px;
    background: $bg-primary;
    border-radius: $radius-lg;
    margin-bottom: 0;
    border: 1px solid $border-color;
    transition: all $transition-normal;

    &.recommended {
      background: linear-gradient(135deg, rgba($success, 0.08) 0%, rgba($success, 0.03) 100%);
      border: 2px solid rgba($success, 0.3);
      position: relative;
      overflow: visible;

      &:hover {
        border-color: rgba($success, 0.5);
        box-shadow: 0 8px 24px rgba($success, 0.15);
      }

      .section-badge {
        position: absolute;
        top: -12px;
        left: 20px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: linear-gradient(135deg, $success 0%, color.adjust($success, $lightness: -8%) 100%);
        color: white;
        font-size: 12px;
        font-weight: 600;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba($success, 0.4);

        i {
          font-size: 14px;
        }
      }

      .header-icon {
        background: linear-gradient(135deg, $success 0%, color.adjust($success, $lightness: -10%) 100%);
        box-shadow: 0 4px 12px rgba($success, 0.3);

        i {
          color: white;
        }
      }
    }

    &.manual {
      background: $bg-card;
      border: 1px solid $border-color;

      &:hover {
        border-color: color.adjust($border-color, $lightness: -8%);
        box-shadow: $shadow-md;
      }

      .manual-icon {
        background: linear-gradient(135deg, $secondary 0%, color.adjust($secondary, $lightness: -10%) 100%);

        i {
          color: white;
        }
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      padding-top: 8px;

      .header-icon {
        width: 48px;
        height: 48px;
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        i {
          font-size: 24px;
        }
      }

      .header-text {
        flex: 1;

        h3 {
          font-size: 16px;
          font-weight: 700;
          color: $text-primary;
          margin: 0 0 4px;
          letter-spacing: -0.3px;
        }

        p {
          font-size: 13px;
          color: $text-muted;
          margin: 0;
        }
      }
    }

    .install-instruction {
      margin-bottom: 12px;

      .instruction-label {
        font-size: 13px;
        font-weight: 500;
        color: $text-secondary;
      }
    }

    .section-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed rgba($success, 0.3);
      font-size: 13px;
      color: $text-muted;

      i {
        font-size: 14px;
        color: $text-muted;
      }

      a {
        color: $success;
        font-weight: 500;
        text-decoration: none;
        transition: color $transition-fast;

        &:hover {
          color: color.adjust($success, $lightness: -10%);
          text-decoration: underline;
        }
      }
    }
  }

  .code-block {
    display: flex;
    align-items: center;
    gap: 0;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-radius: $radius-md;
    padding: 0;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.05);

    .code-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      overflow-x: auto;

      .code-prompt {
        font-family: 'SF Mono', Monaco, 'Consolas', monospace;
        font-size: 14px;
        color: #64748b;
        user-select: none;
      }

      code {
        font-family: 'SF Mono', Monaco, 'Consolas', monospace;
        font-size: 14px;
        color: #4ade80;
        word-break: break-all;
        line-height: 1.5;
      }
    }

    .copy-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 16px 18px;
      background: rgba(255, 255, 255, 0.05);
      border: none;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      cursor: pointer;
      transition: all $transition-fast;
      height: 100%;

      i {
        font-size: 16px;
      }

      .copy-text {
        font-size: 12px;
        font-weight: 500;
      }

      &:hover {
        background: rgba($primary, 0.2);
        color: white;

        i {
          color: #60a5fa;
        }
      }

      &:active {
        background: rgba($primary, 0.3);
      }
    }
  }

  .divider-section {
    display: flex;
    align-items: center;
    gap: 20px;
    margin: 28px 0;
    padding: 0 10px;

    .divider-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, $border-color 50%, transparent 100%);
    }

    .divider-text {
      font-size: 13px;
      font-weight: 500;
      color: $text-muted;
      white-space: nowrap;
      padding: 6px 16px;
      background: $bg-card;
      border: 1px solid $border-color;
      border-radius: 50px;
    }
  }

  .guide-steps {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;

    .step-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: $bg-primary;
      border: 1px solid $border-color;
      border-radius: $radius-md;
      transition: all $transition-fast;

      &:hover {
        background: white;
        border-color: color.adjust($border-color, $lightness: -5%);
        box-shadow: $shadow-sm;

        .step-copy-btn {
          opacity: 1;
        }
      }

      .step-number {
        width: 28px;
        height: 28px;
        min-width: 28px;
        background: $primary-lighter;
        color: $primary;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
      }

      .step-content {
        flex: 1;
        overflow-x: auto;

        code {
          font-family: 'SF Mono', Monaco, 'Consolas', monospace;
          font-size: 13px;
          color: $text-primary;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-all;
        }
      }

      .step-copy-btn {
        width: 32px;
        height: 32px;
        min-width: 32px;
        background: transparent;
        border: 1px solid $border-color;
        border-radius: $radius-sm;
        color: $text-muted;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all $transition-fast;

        i {
          font-size: 14px;
        }

        &:hover {
          background: $primary-lighter;
          border-color: $primary;
          color: $primary;
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
}

// 密钥上传弹窗
.key-upload-content {
  .info-card {
    padding: 16px 20px;
    background: $primary-lighter;
    border-radius: $radius-md;
    margin-bottom: 16px;

    &.warning {
      background: $warning-light;

      .info-card-header i {
        color: $warning;
      }
    }

    .info-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: 10px;

      i {
        font-size: 18px;
        color: $primary;
      }
    }

    ol.info-steps {
      margin: 0;
      padding-left: 20px;

      li {
        font-size: 13px;
        color: $text-secondary;
        line-height: 1.8;

        a {
          color: $primary;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    p {
      font-size: 13px;
      color: $text-secondary;
      margin: 0;
    }
  }

  .key-input-section {
    margin-top: 20px;

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: $text-primary;
      margin-bottom: 8px;
    }

    .key-textarea {
      width: 100%;
      padding: 14px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
      border: 1px solid $border-color;
      border-radius: $radius-sm;
      resize: vertical;
      transition: all $transition-fast;

      &:focus {
        outline: none;
        border-color: $primary;
        box-shadow: 0 0 0 3px rgba($primary, 0.1);
      }

      &::placeholder {
        color: $text-muted;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// ========================================
// 动画
// ========================================
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all $transition-normal;
}

.slide-fade-enter,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all $transition-slow;
}

.fade-slide-enter,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

::v-deep .defineSwitch.el-switch .el-switch__core,
::v-deep .defineSwitch.el-switch .el-switch__label {
  width: 65px !important;

}

::v-deep .el-switch__label {
  height: 21px !important;
}
</style>
