<template>
  <view class="goodList" :style="[bgRadius]">
    <common-wrapper :config="configData">
      <!-- Header Section -->
      <view
        class="header-box"
        :style="[headerBoxStyle]"
        v-if="headerText || headerImg"
      >
        <view
          class="title-text"
          v-if="headerType == 0"
          :style="[titleTextStyle]"
        >
          {{ headerText }}
        </view>
        <view class="title-img" v-else :style="[titleImgBoxStyle]">
          <image
            :src="headerImg"
            mode="widthFix"
            :style="[titleImgStyle]"
            v-if="headerImg"
          ></image>
        </view>
      </view>

      <view v-if="tempArr.length > 0" class="list">
        <!-- 单列 -->
        <view v-if="styleConfig == 0">
          <view
            class="w-full flex justify-between item bg--w111-fff p-20"
            :style="[bgColor, bgRadius]"
            v-for="(item, index) in tempArr"
            :key="index"
            @tap="goDetail(item)"
          >
            <easy-loadimage
              :image-src="item.image"
              width="224rpx"
              height="224rpx"
              :borderRadius="imgStyle"
            ></easy-loadimage>
            <view class="flex-1 flex-col justify-between pl-20">
              <view
                class="w-full fs-28 h-80 lh-40rpx line2"
                v-if="checkboxInfo.includes(0)"
                :style="[productStyle]"
              >
                <text v-if="item.brand_name" class="brand-tag">{{
                  item.brand_name
                }}</text>
                {{ item.store_name }}
              </view>
              <view
                class="flex items-end flex-wrap mt-8 w-full"
                v-if="
                  checkboxInfo.includes(1) &&
                  item.label_list &&
                  item.label_list.length
                "
              >
                <BaseTag
                  :text="label.name"
                  :color="label.font_color"
                  :background="label.bg_color"
                  :borderColor="label.border_color"
                  :circle="label.border_color ? true : false"
                  :imgSrc="label.image"
                  v-for="(label, idx) in item.label_list"
                  :key="idx"
                ></BaseTag>
              </view>
              <view class="flex-between-center" v-if="onlyShowPrice">
                <baseMoney
                  :money="item.price"
                  symbolSize="24"
                  integerSize="40"
                  decimalSize="24"
                  weight
                  :color="priceColor"
                ></baseMoney>
                <view @tap.stop="addCartChange(item, index)" v-if="!showBtn">
                  <view
                    class="w-96 h-56 rd-28rpx flex-center fs-24 text--w111-fff"
                    v-if="btnStyle == 0"
                    :style="[btnBgColor]"
                    >{{ $t(`购买`) }}</view
                  >
                  <view
                    class="rd-24rpx w-44 h-44"
                    :style="[btnTextColor]"
                    v-else-if="btnStyle == 1"
                  >
                    <view class="flex-center cart-btn">
                      <text class="iconfont icon-ic_increase-2 fs-26"></text>
                    </view>
                  </view>
                  <view
                    class="rd-24rpx w-44 h-44"
                    :style="[btnTextColor]"
                    v-else
                  >
                    <view class="flex-center cart-btn">
                      <text class="iconfont icon-ic_ShoppingCart1 fs-26"></text>
                    </view>
                  </view>
                </view>
              </view>
              <view v-else>
                <view class="flex-y-center mt-4 pb-10">
                  <baseMoney
                    :money="item.price"
                    symbolSize="24"
                    integerSize="40"
                    decimalSize="24"
                    weight
                    :color="priceColor"
                    v-if="checkboxInfo.includes(2)"
                  ></baseMoney>
                  <view
                    class="flex h-26 lh-28rpx rd-14rpx bg--w111-F7E9CD fs-22 ml-8"
                    v-if="
                      Number(item.vip_price) > 0 && checkboxInfo.includes(5)
                    "
                  >
                    <text
                      class="inline-block h-26 lh-28rpx svip_rd fs-18 bg--w111-484643 text--w111-FDDAA4 px-8"
                      >SVIP</text
                    >
                    <text class="px-8 fs-22 SemiBold"
                      >{{ $t(`¥`) }}{{ item.vip_price }}</text
                    >
                  </view>
                </view>
                <view class="flex justify-between items-end relative">
                  <view class="flex-y-center">
                    <text
                      class="fs-22"
                      v-if="checkboxInfo.includes(3)"
                      :style="[uniStyle]"
                      >{{ $t(`已售`) }}{{ item.sales
                      }}{{ item.unit_name }}</text
                    >
                    <text
                      class="fs-22 text--w111-999 pl-16"
                      v-if="checkboxInfo.includes(4)"
                      >评分{{ item.star || 0 }}</text
                    >
                  </view>
                  <view
                    class="absolute right-0 bottom-0"
                    @tap.stop="addCartChange(item, index)"
                    v-if="!showBtn"
                  >
                    <view
                      class="w-96 h-56 rd-28rpx flex-center fs-24 text--w111-fff"
                      v-if="btnStyle == 0"
                      :style="[btnBgColor]"
                      >{{ $t(`购买`) }}</view
                    >
                    <view
                      class="rd-24rpx w-44 h-44"
                      :style="[btnTextColor]"
                      v-else-if="btnStyle == 1"
                    >
                      <view class="flex-center cart-btn">
                        <text class="iconfont icon-ic_increase-2 fs-26"></text>
                      </view>
                    </view>
                    <view
                      class="rd-24rpx w-44 h-44"
                      :style="[btnTextColor]"
                      v-else
                    >
                      <view class="flex-center cart-btn">
                        <text
                          class="iconfont icon-ic_ShoppingCart1 fs-26"
                        ></text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <!-- 两列瀑布流 -->
        <view class="wf-page" v-if="goodStyleConfig == 1">
          <!-- left -->
          <view class="item-box">
            <view id="left" v-if="leftList.length">
              <view
                v-for="(item, index) in leftList"
                :key="index"
                class="wf-item"
                @tap="goDetail(item)"
                :style="[bgColor, bgRadius]"
              >
                <view class="pictrue">
                  <easy-loadimage
                    mode="widthFix"
                    :image-src="item.image"
                    width="100%"
                    height="346rpx"
                    :borderRadius="imgStyle"
                  ></easy-loadimage>
                </view>
                <view class="info_box" :style="[bgRadius2]">
                  <view
                    class="w-full line2 fs-28 text--w111-333 lh-40rpx"
                    v-if="checkboxInfo.includes(0)"
                    :style="[productStyle]"
                  >
                    <text v-if="item.brand_name" class="brand-tag">{{
                      item.brand_name
                    }}</text>
                    {{ item.store_name }}
                  </view>
                  <view
                    class="flex items-end flex-wrap mt-8 w-full"
                    v-if="
                      checkboxInfo.includes(1) &&
                      item.label_list &&
                      item.label_list.length
                    "
                  >
                    <BaseTag
                      :text="label.name"
                      :color="label.font_color"
                      :background="label.bg_color"
                      :borderColor="label.border_color"
                      :circle="label.border_color ? true : false"
                      :imgSrc="label.image"
                      v-for="(label, idx) in item.label_list"
                      :key="idx"
                    ></BaseTag>
                  </view>
                  <view class="flex-between-center mt-20" v-if="onlyShowPrice">
                    <baseMoney
                      :money="item.price"
                      symbolSize="24"
                      integerSize="40"
                      decimalSize="24"
                      weight
                      :color="priceColor"
                    ></baseMoney>
                    <view
                      @tap.stop="addCartChange(item, index)"
                      v-if="!showBtn"
                    >
                      <view
                        class="rd-24rpx w-44 h-44"
                        :style="[btnTextColor]"
                        v-if="btnStyle == 0"
                      >
                        <view class="flex-center cart-btn">
                          <text
                            class="iconfont icon-ic_increase-2 fs-26"
                          ></text>
                        </view>
                      </view>
                      <view
                        class="rd-24rpx w-44 h-44"
                        :style="[btnTextColor]"
                        v-else
                      >
                        <view class="flex-center cart-btn">
                          <text
                            class="iconfont icon-ic_ShoppingCart1 fs-26"
                          ></text>
                        </view>
                      </view>
                    </view>
                  </view>
                  <view v-else>
                    <view class="flex-y-center flex-no-wrap mt-8">
                      <baseMoney
                        :money="item.price"
                        symbolSize="24"
                        integerSize="40"
                        decimalSize="24"
                        weight
                        :color="priceColor"
                        v-if="checkboxInfo.includes(2)"
                      ></baseMoney>
                      <view
                        class="inline-block white-nowrap h-26 lh-28rpx rd-14rpx bg--w111-F7E9CD fs-22 ml-8"
                        v-if="
                          Number(item.vip_price) > 0 && checkboxInfo.includes(5)
                        "
                      >
                        <text
                          class="inline-block h-26 lh-28rpx svip_rd fs-18 bg--w111-484643 text--w111-FDDAA4 px-8"
                          >SVIP</text
                        >
                        <text class="px-8 fs-22 SemiBold"
                          >{{ $t(`¥`) }}{{ item.vip_price }}</text
                        >
                      </view>
                    </view>
                    <view class="flex-between-center mt-20">
                      <text
                        class="fs-22"
                        v-if="checkboxInfo.includes(3)"
                        :style="[uniStyle]"
                        >{{ $t(`已售`) }}{{ item.sales
                        }}{{ item.unit_name }}</text
                      >
                      <view
                        @tap.stop="addCartChange(item, index)"
                        v-if="!showBtn"
                      >
                        <view
                          class="rd-24rpx w-44 h-44"
                          :style="[btnTextColor]"
                          v-if="btnStyle == 0"
                        >
                          <view class="flex-center cart-btn">
                            <text
                              class="iconfont icon-ic_increase-2 fs-26"
                            ></text>
                          </view>
                        </view>
                        <view
                          class="rd-24rpx w-44 h-44"
                          :style="[btnTextColor]"
                          v-else
                        >
                          <view class="flex-center cart-btn">
                            <text
                              class="iconfont icon-ic_ShoppingCart1 fs-26"
                            ></text>
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <!-- right -->
          <view class="item-box">
            <view id="right" v-if="rightList.length">
              <view
                v-for="(item, index) in rightList"
                :key="index"
                class="wf-item"
                @tap="goDetail(item)"
                :style="[bgColor, bgRadius]"
              >
                <view class="pictrue">
                  <easy-loadimage
                    mode="widthFix"
                    :image-src="item.image"
                    width="100%"
                    height="346rpx"
                    :borderRadius="imgStyle"
                  ></easy-loadimage>
                </view>
                <view class="info_box" :style="[bgRadius2]">
                  <view
                    class="w-full line2 fs-28 text--w111-333 lh-40rpx"
                    v-if="checkboxInfo.includes(0)"
                    :style="[productStyle]"
                  >
                    <text v-if="item.brand_name" class="brand-tag">{{
                      item.brand_name
                    }}</text>
                    {{ item.store_name }}
                  </view>
                  <view
                    class="flex items-end flex-wrap mt-8 w-full"
                    v-if="
                      checkboxInfo.includes(1) &&
                      item.label_list &&
                      item.label_list.length
                    "
                  >
                    <BaseTag
                      :text="label.name"
                      :color="label.font_color"
                      :background="label.bg_color"
                      :borderColor="label.border_color"
                      :circle="label.border_color ? true : false"
                      :imgSrc="label.image"
                      v-for="(label, idx) in item.label_list"
                      :key="idx"
                    ></BaseTag>
                  </view>
                  <view class="flex-between-center mt-20" v-if="onlyShowPrice">
                    <baseMoney
                      :money="item.price"
                      symbolSize="24"
                      integerSize="40"
                      decimalSize="24"
                      weight
                      :color="priceColor"
                    ></baseMoney>
                    <view
                      @tap.stop="addCartChange(item, index)"
                      v-if="!showBtn"
                    >
                      <view
                        class="rd-24rpx w-44 h-44"
                        :style="[btnTextColor]"
                        v-if="btnStyle == 0"
                      >
                        <view class="flex-center cart-btn">
                          <text
                            class="iconfont icon-ic_increase-2 fs-26"
                          ></text>
                        </view>
                      </view>
                      <view
                        class="rd-24rpx w-44 h-44"
                        :style="[btnTextColor]"
                        v-else
                      >
                        <view class="flex-center cart-btn">
                          <text
                            class="iconfont icon-ic_ShoppingCart1 fs-26"
                          ></text>
                        </view>
                      </view>
                    </view>
                  </view>
                  <view v-else>
                    <view class="flex-y-center mt-8">
                      <baseMoney
                        :money="item.price"
                        symbolSize="24"
                        integerSize="40"
                        decimalSize="24"
                        weight
                        :color="priceColor"
                        v-if="checkboxInfo.includes(2)"
                      ></baseMoney>
                      <view
                        class="flex h-26 lh-28rpx rd-14rpx bg--w111-F7E9CD fs-22 ml-8"
                        v-if="
                          Number(item.vip_price) > 0 && checkboxInfo.includes(5)
                        "
                      >
                        <text
                          class="inline-block h-26 lh-28rpx svip_rd fs-18 bg--w111-484643 text--w111-FDDAA4 px-8"
                          >SVIP</text
                        >
                        <text class="px-8 fs-22 SemiBold"
                          >{{ $t(`¥`) }}{{ item.vip_price }}</text
                        >
                      </view>
                    </view>
                    <view class="flex-between-center mt-20">
                      <text
                        class="fs-22"
                        v-if="checkboxInfo.includes(3)"
                        :style="[uniStyle]"
                        >{{ $t(`已售`) }}{{ item.sales
                        }}{{ item.unit_name }}</text
                      >
                      <view
                        @tap.stop="addCartChange(item, index)"
                        v-if="!showBtn"
                      >
                        <view
                          class="rd-24rpx w-44 h-44"
                          :style="[btnTextColor]"
                          v-if="btnStyle == 0"
                        >
                          <view class="flex-center cart-btn">
                            <text
                              class="iconfont icon-ic_increase-2 fs-26"
                            ></text>
                          </view>
                        </view>
                        <view
                          class="rd-24rpx w-44 h-44"
                          :style="[btnTextColor]"
                          v-else
                        >
                          <view class="flex-center cart-btn">
                            <text
                              class="iconfont icon-ic_ShoppingCart1 fs-26"
                            ></text>
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <!-- 两列展示(横向) -->
        <view
          class="pt-32 pr-24 pb-32 pl-24 bg--w111-fff"
          :style="[bgRadius, bgColor]"
          v-if="goodStyleConfig == 3"
        >
          <view class="grid-column-2 grid-gap-20rpx">
            <view
              class="flex"
              v-for="(item, index) in tempArr"
              :key="index"
              @tap="goDetail(item)"
              :style="[bgRadius]"
            >
              <easy-loadimage
                mode="widthFix"
                :image-src="item.image"
                width="144rpx"
                height="144rpx"
                :borderRadius="imgStyle"
              ></easy-loadimage>
              <view class="flex-1 pl-20">
                <view
                  class="w-full fs-26 h-72 lh-36rpx line2 mb-20"
                  v-if="checkboxInfo.includes(0)"
                  :style="[productStyle]"
                >
                  <text v-if="item.brand_name" class="brand-tag">{{
                    item.brand_name
                  }}</text>
                  {{ item.store_name }}
                </view>
                <baseMoney
                  :money="item.price"
                  symbolSize="24"
                  integerSize="40"
                  decimalSize="24"
                  weight
                  :color="priceColor"
                  v-if="checkboxInfo.includes(2)"
                ></baseMoney>
              </view>
            </view>
          </view>
        </view>
        <!-- 三列 -->
        <view
          class="pt-32 pr-24 pb-32 pl-24 bg--w111-fff"
          :style="[bgColor, bgRadius]"
          v-if="goodStyleConfig == 2"
        >
          <view class="grid-column-3 grid-gap-20rpx">
            <view
              v-for="(item, index) in tempArr"
              :key="index"
              @tap="goDetail(item)"
              :style="[bgRadius]"
            >
              <easy-loadimage
                mode="widthFix"
                :image-src="item.image"
                width="100%"
                height="210rpx"
                :borderRadius="imgStyle"
              ></easy-loadimage>
              <view
                class="w-full fs-28 h-80 lh-40rpx line2 mt-20"
                v-if="checkboxInfo.includes(0)"
                :style="[productStyle]"
              >
                <text v-if="item.brand_name" class="brand-tag">{{
                  item.brand_name
                }}</text>
                {{ item.store_name }}
              </view>
              <view class="flex-between-center mt-14">
                <baseMoney
                  :money="item.price"
                  symbolSize="24"
                  integerSize="40"
                  decimalSize="24"
                  weight
                  :color="priceColor"
                  v-if="checkboxInfo.includes(2)"
                ></baseMoney>
                <view @tap.stop="addCartChange(item, index)" v-if="!showBtn">
                  <view
                    class="rd-24rpx w-44 h-44"
                    :style="[btnTextColor]"
                    v-if="btnStyle == 0"
                  >
                    <view class="flex-center cart-btn">
                      <text class="iconfont icon-ic_increase-2 fs-26"></text>
                    </view>
                  </view>
                  <view
                    class="rd-24rpx w-44 h-44"
                    :style="[btnTextColor]"
                    v-else
                  >
                    <view class="flex-center cart-btn">
                      <text class="iconfont icon-ic_ShoppingCart1 fs-26"></text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <!-- 大图展示 -->
        <view v-if="goodStyleConfig == 4">
          <view
            class="w-full bg--w111-fff item"
            :style="[bgColor, bgRadius]"
            v-for="(item, index) in tempArr"
            :key="index"
            @tap="goDetail(item)"
          >
            <easy-loadimage
              mode="widthFix"
              :image-src="item.image"
              width="100%"
              height="360rpx"
              :borderRadius="imgStyle"
            ></easy-loadimage>
            <view class="p-24">
              <view
                class="w-full line1 fs-28 text--w111-333 lh-40rpx"
                v-if="checkboxInfo.includes(0)"
                :style="[productStyle]"
              >
                <text v-if="item.brand_name" class="brand-tag">{{
                  item.brand_name
                }}</text>
                {{ item.store_name }}
              </view>
              <view
                class="flex items-end flex-wrap mt-8 w-full"
                v-if="
                  checkboxInfo.includes(1) &&
                  item.label_list &&
                  item.label_list.length
                "
              >
                <BaseTag
                  :text="label.name"
                  :color="label.font_color"
                  :background="label.bg_color"
                  :borderColor="label.border_color"
                  :circle="label.border_color ? true : false"
                  :imgSrc="label.image"
                  v-for="(label, idx) in item.label_list"
                  :key="idx"
                ></BaseTag>
              </view>
              <view class="flex-between-center" v-if="onlyShowPrice">
                <baseMoney
                  :money="item.price"
                  symbolSize="24"
                  integerSize="40"
                  decimalSize="24"
                  weight
                  :color="priceColor"
                ></baseMoney>
                <view @tap.stop="addCartChange(item, index)" v-if="!showBtn">
                  <view
                    class="w-96 h-56 rd-28rpx flex-center fs-24 text--w111-fff"
                    v-if="btnStyle == 0"
                    :style="[btnBgColor]"
                    >{{ $t(`购买`) }}</view
                  >
                  <view
                    class="rd-24rpx w-44 h-44"
                    :style="[btnTextColor]"
                    v-else-if="btnStyle == 1"
                  >
                    <view class="flex-center cart-btn">
                      <text class="iconfont icon-ic_increase-2 fs-26"></text>
                    </view>
                  </view>
                  <view
                    class="rd-24rpx w-44 h-44"
                    :style="[btnTextColor]"
                    v-else
                  >
                    <view class="flex-center cart-btn">
                      <text class="iconfont icon-ic_ShoppingCart1 fs-26"></text>
                    </view>
                  </view>
                </view>
              </view>
              <view v-else>
                <view class="flex-y-center mt-8">
                  <baseMoney
                    :money="item.price"
                    symbolSize="24"
                    integerSize="40"
                    decimalSize="24"
                    weight
                    :color="priceColor"
                    v-if="checkboxInfo.includes(2)"
                  ></baseMoney>
                  <view
                    class="flex h-26 lh-28rpx rd-14rpx bg--w111-F7E9CD fs-22 ml-8"
                    v-if="
                      Number(item.vip_price) > 0 && checkboxInfo.includes(5)
                    "
                  >
                    <text
                      class="inline-block h-26 lh-28rpx svip_rd fs-18 bg--w111-484643 text--w111-FDDAA4 px-8"
                      >SVIP</text
                    >
                    <text class="px-8 fs-22 SemiBold"
                      >{{ $t(`¥`) }}{{ item.vip_price }}</text
                    >
                  </view>
                </view>
                <view class="flex justify-between items-end">
                  <view class="flex-y-center">
                    <text
                      class="fs-22 text--w111-999"
                      v-if="checkboxInfo.includes(3)"
                      :style="[uniStyle]"
                      >{{ $t(`已售`) }}{{ item.sales
                      }}{{ item.unit_name }}</text
                    >
                    <text
                      class="fs-22 text--w111-999 pl-16"
                      v-if="checkboxInfo.includes(4)"
                      >{{ $t(`评分`) }}{{ item.star || 0 }}</text
                    >
                  </view>
                  <view @tap.stop="addCartChange(item, index)" v-if="!showBtn">
                    <view
                      class="w-96 h-56 rd-28rpx flex-center fs-24 text--w111-fff"
                      v-if="btnStyle == 0"
                      :style="[btnBgColor]"
                      >{{ $t(`购买`) }}</view
                    >
                    <view
                      class="rd-24rpx w-44 h-44"
                      :style="[btnTextColor]"
                      v-else-if="btnStyle == 1"
                    >
                      <view class="flex-center cart-btn">
                        <text class="iconfont icon-ic_increase-2 fs-26"></text>
                      </view>
                    </view>
                    <view
                      class="rd-24rpx w-44 h-44"
                      :style="[btnTextColor]"
                      v-else
                    >
                      <view class="flex-center cart-btn">
                        <text
                          class="iconfont icon-ic_ShoppingCart1 fs-26"
                        ></text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <!-- 横向滑动 -->
        <view
          class="pt-32 pb-32 pl-24 bg--w111-fff"
          :style="[bgRadius, bgColor]"
          v-if="goodStyleConfig == 5"
        >
          <scroll-view
            scroll-x="true"
            show-scrollbar="false"
            class="white-nowrap vertical-middle w-full"
          >
            <view
              class="inline-block mr-20"
              v-for="(item, index) in tempArr"
              :key="index"
              @tap="goDetail(item)"
              :style="[bgRadius]"
            >
              <easy-loadimage
                mode="widthFix"
                :image-src="item.image"
                width="200rpx"
                height="200rpx"
                :borderRadius="imgStyle"
              ></easy-loadimage>
              <view
                class="w-200 fs-28 h-80 lh-40rpx line2 break_word mt-20"
                v-if="checkboxInfo.includes(0)"
                :style="[productStyle]"
              >
                <text v-if="item.brand_name" class="brand-tag">{{
                  item.brand_name
                }}</text>
                {{ item.store_name }}
              </view>
              <view class="flex-between-center mt-8">
                <baseMoney
                  :money="item.price"
                  symbolSize="24"
                  integerSize="40"
                  decimalSize="24"
                  weight
                  :color="priceColor"
                  v-if="checkboxInfo.includes(2)"
                ></baseMoney>
                <view @tap.stop="addCartChange(item, index)" v-if="!showBtn">
                  <view
                    class="rd-24rpx w-44 h-44"
                    :style="[btnTextColor]"
                    v-if="btnStyle == 0"
                  >
                    <view class="flex-center cart-btn">
                      <text class="iconfont icon-ic_increase-2 fs-26"></text>
                    </view>
                  </view>
                  <view
                    class="rd-24rpx w-44 h-44"
                    :style="[btnTextColor]"
                    v-else
                  >
                    <view class="flex-center cart-btn">
                      <text class="iconfont icon-ic_ShoppingCart1 fs-26"></text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </common-wrapper>
    <productWindow
      :attr="attr"
      :isShow="1"
      :iSplus="1"
      :iScart="1"
      :fangda="false"
      type="2"
      :limitNum="storeInfo.limit_num"
      :minQty="storeInfo.min_qty"
      :unitName="storeInfo.unit_name"
      @myevent="onMyEvent"
      @ChangeAttr="ChangeAttr"
      @ChangeCartNum="ChangeCartNumDuo"
      @attrVal="attrVal"
      @iptCartNum="iptCartNum"
      @goCat="goCatNum"
      id="product-window"
    ></productWindow>
  </view>
</template>

<script>
import { getProductslist, getAttr } from "@/api/store.js";
import skuSelect from "@/mixins/skuSelect.js";
import { toLogin } from "@/libs/login.js";
import { mapGetters, mapState } from "vuex";
import { getCartCounts } from "@/api/order.js";
import { goShopDetail } from "@/libs/order.js";
import productWindow from "@/components/productWindow";
import commonWrapper from "./commonWrapper.vue";
export default {
  name: "goodList",
  components: {
    productWindow,
    commonWrapper,
  },
  props: {
    dataConfig: {
      type: Object,
      default: () => {},
    },
    list: {
      type: Array,
      default: () => [],
    },
    isSortType: {
      type: String | Number,
      default: 0,
    },
  },
  mixins: [skuSelect],
  data() {
    return {
      tempArr: [],
      type: 0,
      attr: {
        cartAttr: false,
        productAttr: [],
        productSelect: {},
      },
      id: 0,
      productValue: [],
      attrValue: "", //已选属性
      storeName: "", //多属性产品名称
      storeInfo: {},
      allList: [], // 全部列表
      leftList: [], // 左边列表
      rightList: [], // 右边列表
      mark: 0, // 列表标记
      boxHeight: [], // 下标0和1分别为左列和右列高度
    };
  },
  watch: {
    list: {
      handler(val) {
        if (val && val.length) this.tempArr = val;
      },
      deep: true,
    },
    // 监听列表数据变化
    tempArr: {
      handler(nVal, oVal) {
        // 如果数据为空或新的列表数据少于旧的列表数据（通常为下拉刷新或切换排序或使用筛选器），初始化变量
        if (
          !this.tempArr.length ||
          (this.tempArr.length === this.updateNum &&
            this.tempArr.length <= this.allList.length)
        ) {
          this.allList = [];
          this.leftList = [];
          this.rightList = [];
          this.boxHeight = [];
          this.mark = 0;
        }
        // 如果列表有值，调用waterfall方法

        if (this.tempArr.length) {
          this.allList = this.tempArr;
          this.leftList = [];
          this.rightList = [];
          this.boxHeight = [];
          this.allList.forEach((v, i) => {
            if (
              this.allList.length < 3 ||
              (this.allList.length <= 7 && this.allList.length - i > 1) ||
              (this.allList.length > 7 && this.allList.length - i > 2)
            ) {
              if (i % 2) {
                this.rightList.push(v);
              } else {
                this.leftList.push(v);
              }
            }
          });
          if (this.allList.length < 3) {
            this.mark = this.allList.length + 1;
          } else if (this.allList.length <= 7) {
            this.mark = this.allList.length - 1;
          } else {
            this.mark = this.allList.length - 2;
          }
          if (this.mark < this.allList.length) {
            this.waterFall();
          }
        }
      },
      immediate: true,
      deep: true,
    },
    // 监听标记，当标记发生变化，则执行下一个item排序
    mark() {
      const len = this.allList.length;
      if (this.mark < len && this.mark !== 0 && this.boxHeight.length) {
        this.waterFall();
      }
    },
    dataConfig() {
      this.productslist();
    },
  },
  computed: {
    ...mapState({
      cartNum: (state) => state.indexData.cartNum,
    }),
    ...mapGetters(["isLogin", "uid", "cartNum"]),
    showHeader() {
      // You might want to control visibility based on config, but admin doesn't seem to have a global 'show header' switch for this component,
      // it just has header settings. Assuming always show if configured.
      return true;
    },
    headerType() {
      return this.dataConfig.headerType ? this.dataConfig.headerType.tabVal : 0;
    },
    headerText() {
      return this.dataConfig.headerText ? this.dataConfig.headerText.value : "";
    },
    headerImg() {
      return this.dataConfig.headerImg ? this.dataConfig.headerImg.url : "";
    },
    headerBoxStyle() {
      const alignMap = ["left", "center", "right"];
      const align = this.dataConfig.headerAlign
        ? alignMap[this.dataConfig.headerAlign.tabVal]
        : "left";
      return {
        "text-align": align,
        "margin-bottom": "20rpx",
        padding: "0 20rpx",
      };
    },
    titleTextStyle() {
      const alignMap = ["left", "center", "right"];
      const align = this.dataConfig.headerAlign
        ? alignMap[this.dataConfig.headerAlign.tabVal]
        : "left";
      const color =
        this.dataConfig.headerColor &&
        this.dataConfig.headerColor.color &&
        this.dataConfig.headerColor.color[0]
          ? this.dataConfig.headerColor.color[0].item
          : "#333";
      const fontSize = this.dataConfig.headerFontSize
        ? this.dataConfig.headerFontSize.val * 2 + "rpx"
        : "32rpx";
      const fontWeight =
        this.dataConfig.headerTextConfig &&
        this.dataConfig.headerTextConfig.tabVal == 0
          ? "bold"
          : "normal";
      const fontStyle =
        this.dataConfig.headerTextConfig &&
        this.dataConfig.headerTextConfig.tabVal == 2
          ? "italic"
          : "normal";

      return {
        color: color,
        "font-size": fontSize,
        "font-weight": fontWeight,
        "font-style": fontStyle,
        "text-align": align,
      };
    },
    titleImgBoxStyle() {
      const alignMap = ["left", "center", "right"];
      const align = this.dataConfig.headerAlign
        ? alignMap[this.dataConfig.headerAlign.tabVal]
        : "left";
      return {
        "text-align": align,
      };
    },
    titleImgStyle() {
      return {
        height: "auto",
        display: "inline-block", // inline-block allows text-align on parent to work
      };
    },
    configData() {
      return {
        ...this.dataConfig,
      };
    },
    bgRadius() {
      let borderRadius = `${this.dataConfig.fillet.val * 2}rpx`;
      if (this.dataConfig.fillet.type) {
        borderRadius = `${this.dataConfig.fillet.valList[0].val * 2}rpx ${
          this.dataConfig.fillet.valList[1].val * 2
        }rpx ${this.dataConfig.fillet.valList[3].val * 2}rpx ${
          this.dataConfig.fillet.valList[2].val * 2
        }rpx`;
      }
      return {
        borderRadius: borderRadius,
      };
    },
    bgRadius2() {
      let borderRadius = `0 0 ${this.dataConfig.fillet.val * 2}rpx ${
        this.dataConfig.fillet.val * 2
      }rpx`;
      if (this.dataConfig.fillet.type) {
        borderRadius = `0 0 ${this.dataConfig.fillet.valList[3].val * 2}rpx ${
          this.dataConfig.fillet.valList[2].val * 2
        }rpx`;
      }
      return {
        borderRadius: borderRadius,
      };
    },
    bgColor() {
      const bgColorLeft =
        this.dataConfig.moduleColor && this.dataConfig.moduleColor.color
          ? this.dataConfig.moduleColor.color[0].item
          : "#F5F5F5";
      const bgColorRight =
        this.dataConfig.moduleColor && this.dataConfig.moduleColor.color
          ? this.dataConfig.moduleColor.color[1].item
          : "#F5F5F5";
      return {
        background: `linear-gradient(90deg,${bgColorLeft} 0%,${bgColorRight} 100%)`,
      };
    },
    styleConfig() {
      return this.dataConfig.styleConfig.tabVal;
    },
    /*商品图片圆角样式*/
    imgStyle() {
      let borderRadius = `${this.dataConfig.filletImg.val * 2}rpx`;
      if (this.dataConfig.styleConfig.tabVal == 1) {
        borderRadius = `${this.dataConfig.filletImg.val * 2}rpx ${
          this.dataConfig.filletImg.val * 2
        }rpx 0 0`;
      }
      if (this.dataConfig.filletImg.type) {
        borderRadius = `${this.dataConfig.filletImg.valList[0].val * 2}rpx ${
          this.dataConfig.filletImg.valList[1].val * 2
        }rpx ${this.dataConfig.filletImg.valList[3].val * 2}rpx ${
          this.dataConfig.filletImg.valList[2].val * 2
        }rpx`;
        if (this.dataConfig.styleConfig.tabVal == 1) {
          borderRadius = `${this.dataConfig.filletImg.valList[0].val * 2}rpx ${
            this.dataConfig.filletImg.valList[1].val * 2
          }rpx 0 0`;
        }
      }
      let imgRadius = `${this.dataConfig.fillet.val * 2}rpx ${
        this.dataConfig.fillet.val * 2
      }rpx 0 0`;
      if (this.dataConfig.fillet.type) {
        imgRadius = `${this.dataConfig.fillet.valList[0].val * 2}rpx ${
          this.dataConfig.fillet.valList[1].val * 2
        }rpx 0 0`;
      }
      return this.dataConfig.name == "promotionList" ? imgRadius : borderRadius;
    },
    /*商品名称样式*/
    productStyle() {
      return {
        color: this.dataConfig.goodsNameColor.color[0].item,
        fontWeight: this.dataConfig.goodsName.tabVal ? "normal" : "bold",
      };
    },
    /* 展示信息 */
    checkboxInfo() {
      return this.dataConfig.checkboxInfo.type;
    },
    /* 价格颜色 */
    priceColor() {
      return this.dataConfig.toneCartConfig.tabVal
        ? this.dataConfig.goodsPriceColor.color[0].item
        : "var(--view-theme)";
    },
    /* 划线价颜色 */
    otPriceColor() {
      return this.dataConfig.goodsPriceColor.color[0].item;
    },
    btnStyle() {
      return this.dataConfig.bntStyleConfig.tabVal;
    },
    showBtn() {
      return this.dataConfig.cartConfig.tabVal;
    },
    /* 按钮颜色 */
    btnBgColor() {
      return {
        background: this.dataConfig.toneConfig.tabVal
          ? `linear-gradient(90deg,${this.dataConfig.bntBgColor.color[0].item} 0%,${this.dataConfig.bntBgColor.color[1].item} 100%)`
          : "linear-gradient(90deg, var(--view-theme) 0%, var(--view-gradient) 100%)",
      };
    },
    btnTextColor() {
      return {
        color: "#FFFFFF",
        background: this.dataConfig.toneCartConfig.tabVal
          ? `linear-gradient(90deg, ${this.dataConfig.bntBgColor.color[0].item} 0%, ${this.dataConfig.bntBgColor.color[1].item} 100%)`
          : "linear-gradient(90deg, var(--view-theme) 0%, var(--view-gradient) 100%)",
      };
    },
    uniStyle() {
      return {
        color: this.dataConfig.toneConfig.tabVal
          ? this.dataConfig.soldNumColor.color[0].item || "#999"
          : "#999",
      };
    },
    /*商品数量*/
    numberConfig() {
      return this.dataConfig.numberConfig.val;
    },
    /*商品模板*/
    goodStyleConfig() {
      return this.dataConfig.styleConfig.tabVal;
    },
    /*检索条件  0综合 1销量 2价格*/
    goodsSort() {
      return this.dataConfig.goodsSort.tabVal;
    },
    /*按照什么方式选择商品 1 指定商品 3指定分类 4 商品标签 */
    typeConfig() {
      return this.dataConfig.typeConfig.activeValue;
    },
    bntConfig() {
      return this.dataConfig.bntConfig.tabVal;
    },
    onlyShowPrice() {
      if (
        this.checkboxInfo.toString() == "0,2" ||
        this.checkboxInfo.toString() == "2,0" ||
        this.checkboxInfo.toString() == "2"
      ) {
        return true;
      } else {
        return false;
      }
    },
  },
  created() {
    // #ifndef APP-PLUS
    // this.$eventHub.$on('product_video_observe', () => {
    // 	this.observeVideo();
    // });
    // #endif
  },
  mounted() {
    this.productslist();
  },
  methods: {
    observeVideo() {
      let observer = uni.createIntersectionObserver(this, { observeAll: true });
      observer.relativeToViewport().observe(".video", (res) => {
        if (res.intersectionRatio) {
          uni.createVideoContext(res.id, this).play();
        } else {
          uni.createVideoContext(res.id, this).pause();
        }
      });
    },
    productslist() {
      if (this.list && this.list.length) {
        this.tempArr = this.list;
        return;
      }
      let limit = this.$config.LIMIT;
      let data = {};
      if (this.typeConfig == 1) {
        const goodsList = this.dataConfig.goodsList.list || [];
        const ids = goodsList.map(item => item.id).filter(Boolean).join(',');
        if (ids) {
          data = { ids };
        } else {
          this.tempArr = [];
          return;
        }
      } else if (this.typeConfig == 3) {
        data = {
          priceOrder: this.goodsSort == 2 ? "desc" : "",
          salesOrder: this.goodsSort == 1 ? "desc" : "",
          cate_id: this.dataConfig.classList.classVal
            ? this.dataConfig.classList.classVal.join(",")
            : "",
          limit: this.numberConfig,
        };
      } else if (this.typeConfig == 4) {
        data = {
          priceOrder: this.goodsSort == 2 ? "desc" : "",
          salesOrder: this.goodsSort == 1 ? "desc" : "",
          store_label_id: this.dataConfig.goodsLabel.activeValue
            ? this.dataConfig.goodsLabel.activeValue.join(",")
            : "",
          limit: this.numberConfig,
        };
      }
      getProductslist(data).then((res) => {
        this.tempArr = res.data;
      });
    },
    goDetail(item) {
      goShopDetail(item, this.$store.state.app.uid).then((res) => {
        uni.navigateTo({
          url: `/pages/goods_details/index?id=${item.id}`,
        });
      });
    },
    // 商品详情接口；
    getAttrs(id) {
      let that = this;
      getAttr(id, 0).then((res) => {
        that.$set(that.attr, "productAttr", res.data.productAttr);
        that.$set(that, "productValue", res.data.productValue);
        that.$set(that, "storeInfo", res.data.storeInfo);
        that.DefaultSelect();
      });
    },
    addCartChange(item, index) {
      if (this.bntConfig == 1) {
        if (item.spec_type) {
          this.goCartDuo(item);
        } else {
          this.goCartDan(item, index);
        }
      } else {
        this.goDetail(item);
      }
    },
    getCartNum() {
      let that = this;
      getCartCounts().then((res) => {
        this.$store.commit("indexData/setCartNum", res.data.count);
      });
    },
    // 瀑布流排序
    waterFall() {
      const i = this.mark;
      if (i == 0) {
        // 初始化，从左边开始插入
        this.leftList.push(this.allList[i]);
        // 更新左边列表高度
        this.getViewHeight(0);
      } else if (i == 1) {
        // 第二个item插入，默认为右边插入
        this.rightList.push(this.allList[i]);
        // 更新右边列表高度
        this.getViewHeight(1);
      } else {
        // 根据左右列表高度判断下一个item应该插入哪边
        if (!this.boxHeight.length) {
          this.rightList.length < this.leftList.length
            ? this.rightList.push(this.allList[i])
            : this.leftList.push(this.allList[i]);
        } else {
          const leftOrRight = this.boxHeight[0] > this.boxHeight[1] ? 1 : 0;
          if (leftOrRight) {
            this.rightList.push(this.allList[i]);
          } else {
            this.leftList.push(this.allList[i]);
          }
        }
        // 更新插入列表高度
        this.getViewHeight();
      }
    },
    // 获取列表高度
    getViewHeight() {
      // 使用nextTick，确保页面更新结束后，再请求高度
      this.$nextTick(() => {
        setTimeout(() => {
          uni
            .createSelectorQuery()
            .in(this)
            .select("#right")
            .boundingClientRect((res) => {
              res ? (this.boxHeight[1] = res.height) : "";
              uni
                .createSelectorQuery()
                .in(this)
                .select("#left")
                .boundingClientRect((res) => {
                  res ? (this.boxHeight[0] = res.height) : "";
                  this.mark = this.mark + 1;
                })
                .exec();
            })
            .exec();
        }, 100);
      });
    },
  },
};
</script>

<style lang="scss">
$page-padding: 10px;
$grid-gap: 10px;
.wf-page {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  .item-box {
    width: 48.5%;
    margin-bottom: 20rpx;
  }
}
.wf-item {
  width: 100%;
  margin-bottom: 20rpx;
}
.wf-page1 .wf-item {
  margin-top: 20rpx;
  border-radius: 20rpx;
  padding-bottom: 0;
}
.item ~ .item {
  margin-top: 20rpx;
}
.info_box {
  padding: 16rpx 20rpx;
  border-radius: 0 0 20rpx 20rpx;
}
.bg--w111-484643 {
  background: linear-gradient(90deg, #484643 0%, #1f1b17 100%);
}
.text--w111-FDDAA4 {
  color: #fddaa4;
}
.svip_rd {
  border-radius: 14rpx 0 8rpx 14rpx;
}
.cart-btn {
  // background:rgba(255,255,255,0.9);
  width: 100%;
  height: 100%;
}
</style>
