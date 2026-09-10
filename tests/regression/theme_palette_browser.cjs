// Exercise the production detail page; product/cart/collection responses are isolated fixtures.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { root, transform, compiler } = require("./theme_component_harness.cjs");
const h5 = path.resolve(
  process.env.CRMEB_H5_BUILD || path.join(root, ".build/page-actions/h5")
);
function shared(name) {
  const m = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    transform(
      fs.readFileSync(path.join(root, "template/shared", name + ".js"), "utf8")
    )
  )(m, m.exports, (id) => shared(id.replace("./", "")));
  return m.exports;
}
function defaults(name) {
  const m = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    transform(
      compiler.parseComponent(
        fs.readFileSync(
          path.join(
            root,
            "template/admin/src/components/mobilePage",
            name + ".vue"
          ),
          "utf8"
        )
      ).script.content
    )
  )(m, m.exports, (id) =>
    id === "vuex"
      ? { mapState: () => ({}) }
      : id.includes("shared/")
      ? shared(id.split("/").pop())
      : {}
  );
  return m.exports.default.data.call({ num: 1 }).defaultConfig;
}
const header = defaults("search_box");
header.headerActions = shared("pageActions").headerActions({
  left: [{ type: "home", showLabel: true }],
  right: [
    { type: "collect", showLabel: true },
    { type: "share", showLabel: true },
  ],
});
const bar = defaults("home_bottom_menu");
const info = defaults("home_product_info");
const navigation = shared("navigationComponent").navigationComponent({
  scrollMode: "always",
});
const homeGoods = defaults("home_goods_list"),
  userInfo = defaults("home_userInfor");
const theme = {
  actions_mode: "components",
  navigation_mode: "page",
  value: { header, info, bar },
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://local");
  if (url.pathname === "/fixture-product.png") {
    res.setHeader("Content-Type", "image/png");
    fs.createReadStream(
      path.join(root, "template/admin/src/assets/images/product-diy.png")
    ).pipe(res);
    return;
  }
  if (url.pathname.startsWith("/api/"))
    return http
      .get("http://127.0.0.1:8011" + req.url, (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      })
      .on("error", () => {
        res.writeHead(502);
        res.end();
      });
  let file = path.resolve(h5, "." + url.pathname);
  if (
    !file.startsWith(h5 + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  )
    file = path.join(h5, "index.html");
  res.setHeader(
    "Content-Type",
    {
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".html": "text/html",
    }[path.extname(file)] || "application/octet-stream"
  );
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(20000);
    let palette = {
        theme_color: "#3388FF",
        gradient_color: "#67B4FF",
        sub_color: "#236ABF",
      },
      failed = false;
    const product = {
      id: 22,
      store_name: "主题联动测试商品",
      price: 99,
      vip_price: 90,
      ot_price: 110,
      stock: 10,
      cart_button: 1,
      min_qty: 1,
      presale: 0,
      userCollect: false,
      image: base + "/fixture-product.png",
      slider_image: [base + "/fixture-product.png"],
      description: "",
      is_gift: 0,
      cart_num: 0,
      activity: null,
    };
    const category = {
      status: 3,
      page_title: "分类配色验证",
      price_color: "#123456",
      actions_mode: "components",
      navigation_mode: "page",
    };
    await page.route("**/api/**", async (route) => {
      const u = new URL(route.request().url());
      let data;
      if (u.pathname === "/api/theme_info/theme")
        return route.fulfill({
          json: failed
            ? { status: 500, msg: "fixture offline" }
            : { status: 200, data: palette },
        });
      else if (u.pathname === "/api/theme_info/home")
        data = {
          navigation_mode: "page",
          value: { goods: homeGoods, nav: navigation },
        };
      else if (u.pathname === "/api/theme_info/user")
        data = {
          navigation_mode: "page",
          value: { user: userInfo, nav: navigation },
        };
      else if (u.pathname === "/api/theme_info/detail") data = theme;
      else if (u.pathname === "/api/theme_info/category") data = category;
      else if (u.pathname === "/api/theme/navigation") data = navigation;
      else if (u.pathname === "/api/category")
        data = [
          {
            id: 1,
            cate_name: "家居",
            pic: product.image,
            children: [{ id: 11, cate_name: "家电", pic: product.image }],
          },
        ];
      else if (
        u.pathname === "/api/products" ||
        u.pathname === "/api/theme/product"
      )
        data = [product, { ...product, id: 23 }];
      else if (u.pathname === "/api/product/detail/22")
        data = {
          storeInfo: product,
          productAttr: [],
          productValue: {},
          coupons: [],
          good_list: [],
          replyCount: 0,
          replyChance: 0,
          spec_unique: "test",
          routine_contact_type: 0,
        };
      else if (u.pathname.startsWith("/api/product/real_price/"))
        data = { real_price: 99, member_price: 90, ot_price: 110 };
      else if (u.pathname === "/api/cart/count") data = { count: 0, ids: [] };
      else if (u.pathname === "/api/user" || u.pathname === "/api/theme/user")
        data = { uid: 1, nickname: "验证用户", orderStatusNum: {} };
      else if (u.pathname === "/api/user/level/info")
        data = { level_info: { grade: 1 }, level_list: [] };
      else if (u.pathname === "/api/v2/cart_list") data = [];
      else if (u.pathname === "/api/v2/get_today_coupon") data = { list: [] };
      else if (u.pathname === "/api/v2/new_coupon")
        data = { show: false, list: [] };
      else if (/image_base64|set_visit/.test(u.pathname)) data = {};
      else if (route.request().method() !== "GET")
        return route.fulfill({
          json: { status: 400, msg: "Fixture does not write to server" },
        });
      else return route.continue();
      return route.fulfill({ json: { status: 200, msg: "成功", data } });
    });
    await page.goto(base + "/pages/index/index", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      getApp().$store.commit("LOGIN", { token: "palette-fixture", time: 0 });
      getApp().$store.commit("SETUID", 1);
    });
    async function checkCurrent(expected) {
      await page.waitForFunction(
        (color) =>
          getComputedStyle(document.documentElement)
            .getPropertyValue("--view-theme")
            .trim() === color,
        expected
      );
      const mismatches = await page.evaluate(
        (expected) =>
          Array.from(document.querySelectorAll('[style*="--view-theme:"]'))
            .filter(
              (e) =>
                getComputedStyle(e).getPropertyValue("--view-theme").trim() !==
                expected
            )
            .map((e) => e.className),
        expected
      );
      assert.deepEqual(
        mismatches,
        [],
        "all component roots receive the current theme"
      );
    }
    const routes = [
      "/pages/index/index",
      "/pages/goods_cate/goods_cate",
      "/pages/goods_details/index?id=22",
      "/pages/user/index",
    ];
    for (const [index, route] of routes.entries()) {
      if (index)
        await page.evaluate(
          (path) =>
            getApp().$router.push({
              type: path.includes("goods_details") ? "navigateTo" : "switchTab",
              path,
            }),
          route
        );
      if (index === 2) await page.locator(".footer.commerce-actions").waitFor();
      else await page.locator(".store-navigation .footer-dock").waitFor();
      if (index === 1)
        await page
          .locator(".category-decorated .product-price")
          .first()
          .waitFor();
      palette = {
        theme_color: "#3388FF",
        gradient_color: "#67B4FF",
        sub_color: "#236ABF",
      };
      // Trigger the actual page-show lifecycle after the request coalescing interval.
      async function show() {
        await page.waitForTimeout(1100);
        await page.evaluate(() => {
          const vm = getCurrentPages().at(-1).$vm;
          for (const fn of vm.$options.onShow || []) fn.call(vm);
        });
      }
      await show();
      await checkCurrent("#3388FF");
      palette = {
        theme_color: "#804DFF",
        gradient_color: "#AD85FF",
        sub_color: "#37206D",
      };
      await show();
      await checkCurrent("#804DFF");
      if (index === 1)
        assert.equal(
          await page
            .locator(".category-decorated .product-price")
            .first()
            .evaluate((e) => getComputedStyle(e).color),
          "rgb(18, 52, 86)",
          "explicit category price stays unchanged"
        );
      if (index === 2) {
        assert.match(
          await page
            .locator(".footer uni-button.buy")
            .evaluate((e) => getComputedStyle(e).backgroundImage),
          /128, 77, 255/
        );
        assert.match(
          await page
            .locator(".footer uni-button.joinCart")
            .evaluate((e) => getComputedStyle(e).background),
          /55, 32, 109/
        );
      } else {
        assert.equal(
          await page
            .locator(".store-navigation .txt.active")
            .evaluate((e) => getComputedStyle(e).color),
          "rgb(128, 77, 255)"
        );
      }
      failed = true;
      await show();
      await checkCurrent("#804DFF");
      failed = false;
      fs.mkdirSync(path.join(root, ".build/theme-palettes/screenshots"), {
        recursive: true,
      });
      await page.screenshot({
        path: path.join(
          root,
          `.build/theme-palettes/screenshots/h5-page-${index}.png`
        ),
      });
      console.log("PASS live palette refresh and failure fallback: " + route);
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS four production pages, component roots, custom category color and product action gradients"
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
