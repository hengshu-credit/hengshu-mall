<template>
  <div class="Box" v-loading="spinShow">
    <div>
      <div class="tips">
        生成的商品默认是没有上架的，请手动检查并上架商品！
        <a href="https://doc.crmeb.com/single/v5/7785" v-if="copyConfig.copy_type == 2" target="_blank"
          >如何配置原采集服务密钥</a
        >
        <span v-else-if="copyConfig.copy_type == 1">
          您当前剩余{{ copyConfig.copy_num }}条原采集服务次数，
          <span class="add" v-db-click @click="mealPay()">增加采集次数</span>
        </span>
      </div>
      <div v-if="copyConfigStatus === 'loading'">正在读取商品采集配置…</div>
      <div v-else-if="copyConfigStatus === 'error'" class="config-error">
        商品采集配置读取失败，您仍可提交链接尝试采集。
      </div>
      <div v-else-if="copyConfig.jd_enabled && copyConfig.jd_configured">
        当前使用本地京东采集服务，支持京东商品详情链接。
      </div>
      <div v-else-if="copyConfig.jd_enabled" class="config-error">京东独立采集已开启，但服务配置不完整。</div>
      <div>
        商品采集设置：
        <span class="add" v-db-click @click="openCollectionConfig"
          >设置 &gt; 系统设置 &gt; 第三方接口设置 &gt; 采集商品配置</span
        >
      </div>
    </div>
    <el-form
      class="formValidate mt20"
      ref="formValidate"
      label-width="80px"
      label-position="right"
      @submit.native.prevent
    >
      <el-form-item label="链接地址：">
        <el-input
          clearable
          v-model="soure_link"
          maxlength="2048"
          placeholder="请输入 http 或 https 商品链接"
          class="numPut"
        />
        <el-button type="primary" class="ml15" :disabled="spinShow" v-db-click @click="add">确定</el-button>
      </el-form-item>
      <div v-if="collectionStatus" class="collection-status" :class="{ 'config-error': collectionFailed }">
        {{ collectionStatus }}
      </div>
    </el-form>
  </div>
</template>

<script>
import { crawlFromApi, copyConfigApi } from '@/api/product';
import { createCollectionRunner, isCollectionCancelled, validateCollectionUrl } from '@/libs/productCollection';

export default {
  name: 'taoBao',
  data() {
    return {
      soure_link: '',
      spinShow: false,
      collectionPromise: null,
      collectionRunner: null,
      collectionStatus: '',
      collectionFailed: false,
      copyConfigStatus: 'loading',
      copyConfig: {
        copy_type: 2,
        copy_num: 0,
        jd_enabled: false,
        jd_configured: false,
      },
    };
  },
  created() {
    this.collectionRunner = createCollectionRunner({ request: crawlFromApi });
  },
  mounted() {
    this.getCopyConfig();
  },
  beforeDestroy() {
    if (this.collectionRunner) this.collectionRunner.cancel();
  },
  methods: {
    mealPay() {
      this.$router.push({ path: this.$routeProStr + '/setting/sms/sms_config/index' });
    },
    openCollectionConfig() {
      this.$router.push({ path: this.$routeProStr + '/setting/other_config/copy/2/41' });
    },
    async getCopyConfig() {
      this.copyConfigStatus = 'loading';
      try {
        const res = await copyConfigApi();
        this.copyConfig = {
          ...this.copyConfig,
          copy_type: res.data.copy_type,
          copy_num: res.data.copy_num,
          jd_enabled: Boolean(res.data.jd_enabled),
          jd_configured: Boolean(res.data.jd_configured),
        };
        this.copyConfigStatus = 'ready';
      } catch (error) {
        this.copyConfigStatus = 'error';
      }
    },
    add() {
      if (this.collectionPromise) return this.collectionPromise;
      let url;
      try {
        url = validateCollectionUrl(this.soure_link);
      } catch (error) {
        this.$message.warning(error.message);
        return Promise.resolve();
      }

      this.soure_link = url;
      this.spinShow = true;
      this.collectionFailed = false;
      this.collectionStatus = '正在采集商品信息，京东链接可能需要几分钟…';
      const promise = this.collectionRunner
        .collect({ type: 'taobao', url })
        .then((data) => {
          const info = data.productInfo;
          info.soure_link = info.soure_link || url;
          const warnings = Array.isArray(info.collection_warnings) ? [...info.collection_warnings] : [];
          if (
            info.attr &&
            Number(info.attr.price) <= 0 &&
            !warnings.some((item) => item.includes('价格') && item.includes('手动'))
          ) {
            warnings.push('采集结果没有可用价格，请手动填写商品价格。');
          }
          if (warnings.length) this.$message.warning(warnings.join('；'));
          this.collectionStatus = '采集完成，正在填入商品信息。';
          this.$emit('on-close', info);
        })
        .catch((error) => {
          if (isCollectionCancelled(error)) return;
          const message = error && error.message ? error.message : '商品采集失败，请稍后重试';
          this.collectionFailed = true;
          this.collectionStatus = message;
          this.$message.error(message);
        })
        .finally(() => {
          if (this.collectionPromise === promise) {
            this.collectionPromise = null;
            this.spinShow = false;
          }
        });
      this.collectionPromise = promise;
      return promise;
    },
  },
};
</script>

<style lang="scss" scoped>
.add {
  color: #2d8cf0;
  cursor: pointer;
}
.config-error {
  color: #e6a23c;
}
.collection-status {
  margin-left: 80px;
  color: #606266;
}
.Box .numPut {
  width: 414px !important;
}
</style>
