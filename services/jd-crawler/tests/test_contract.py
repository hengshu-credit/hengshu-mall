import math
import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from jd_crawler.contract import ContractError, canonicalize_item_url, map_product, normalize_media_url


class CanonicalUrlTests(unittest.TestCase):
    def test_accepts_desktop_and_mobile_item_urls(self):
        cases = {
            "https://item.jd.com/100012043978.html?utm_source=x#detail":
                "https://item.jd.com/100012043978.html",
            "http://item.m.jd.com/product/100012043978.html":
                "https://item.jd.com/100012043978.html",
            "https://m.item.jd.com/product/100012043978.html":
                "https://item.jd.com/100012043978.html",
        }
        for supplied, expected in cases.items():
            with self.subTest(supplied=supplied):
                self.assertEqual(canonicalize_item_url(supplied), expected)

    def test_rejects_non_item_urls_and_url_confusion(self):
        rejected = [
            "https://example.com/100012043978.html",
            "https://item.jd.com.evil.test/100012043978.html",
            "https://user@item.jd.com/100012043978.html",
            "https://item.jd.com:443/100012043978.html",
            "https://item.jd.com:bad/100012043978.html",
            "https://item.jd.com/100012043978.html/extra",
            "javascript:alert(1)",
            "not a url",
            "https://item.jd.com/12\n34.html",
            "https://item.jd.com/１２３.html",
            123,
        ]
        for supplied in rejected:
            with self.subTest(supplied=supplied):
                with self.assertRaises(ContractError) as raised:
                    canonicalize_item_url(supplied)
                self.assertEqual(raised.exception.code, "invalid_url")


class ProductMappingTests(unittest.TestCase):
    def test_jd_avif_variant_is_preserved_as_native_material(self):
        self.assertEqual(normalize_media_url('https://img30.360buyimg.com/sku/jfs/detail.jpg.avif'),
                         'https://img30.360buyimg.com/sku/jfs/detail.jpg.avif')
        self.assertIsNone(normalize_media_url('https://img30.360buyimg.com:bad/a.jpg'))

    def test_maps_only_current_page_values_and_jd_images(self):
        raw = {
            "title": "  京东真实商品标题  ",
            "price": "1299.50",
            "gallery": [
                [
                    {"type": "image", "size": "228", "url": "//img10.360buyimg.com/n1/a.jpg"},
                    {"type": "image", "size": "1440", "url": "http://img10.360buyimg.com/n0/a.jpg"},
                ],
                [{"type": "video", "size": "video", "url": "https://video.360buyimg.com/a.mp4"}],
                {"type": "image", "url": "https://img14.jdimg.com/b.jpg`"},
                {"type": "image", "url": "https://evil.test/tracker.jpg"},
            ],
            "attributes": [
                {"group": "基础信息", "name": " 品牌 ", "value": " 京造 "},
                {"name": "", "value": "ignored"},
            ],
            "sku_groups": [
                {
                    "label": "颜色",
                    "options": [
                        {"name": "红色", "selected": False},
                        {"name": "蓝色", "selected": True},
                    ],
                },
                {
                    "label": "容量",
                    "options": [{"name": "1L", "selected": True}],
                },
            ],
            "video_url": "//jdvideo.jd.com/product/demo.mp4?token=public",
        }
        details = [
            {"type": "image", "url": "//img30.360buyimg.com/sku/jfs/detail.jpg"},
            {"type": "image", "url": "https://evil.test/detail.jpg"},
        ]

        product = map_product("https://item.jd.com/100012043978.html", raw, details)

        self.assertEqual(product["sku_id"], "100012043978")
        self.assertEqual(product["source_url"], "https://item.jd.com/100012043978.html")
        self.assertEqual(product["title"], "京东真实商品标题")
        self.assertEqual(product["price"], 1299.5)
        self.assertEqual(product["video_link"], "https://jdvideo.jd.com/product/demo.mp4?token=public")
        self.assertEqual(
            product["images"],
            [
                "https://img10.360buyimg.com/n0/a.jpg",
                "https://img14.jdimg.com/b.jpg",
            ],
        )
        self.assertEqual(
            product["detail_images"],
            ["https://img30.360buyimg.com/sku/jfs/detail.jpg"],
        )
        self.assertEqual(product["attributes"], [{"name": "品牌", "value": "京造"}])
        self.assertEqual(
            product["selected_specs"],
            [{"name": "颜色", "value": "蓝色"}, {"name": "容量", "value": "1L"}],
        )
        self.assertEqual(product["warnings"], [])
        self.assertEqual(
            set(product),
            {"sku_id", "source_url", "title", "price", "video_link", "images", "detail_images",
             "attributes", "selected_specs", "warnings"},
        )

    def test_unknown_real_fields_are_null_or_empty_and_warned(self):
        product = map_product(
            "https://item.jd.com/1.html",
            {"title": "商品", "price": "待登录查看", "gallery": [], "attributes": [], "sku_options": []},
            [],
        )
        self.assertIsNone(product["price"])
        self.assertIsNone(product["video_link"])
        self.assertEqual(product["images"], [])
        self.assertEqual(product["detail_images"], [])
        self.assertEqual(
            product["warnings"],
            ["price_unavailable", "images_unavailable", "detail_images_unavailable"],
        )

    def test_video_prefers_direct_jd_file_and_does_not_treat_hls_as_downloadable(self):
        direct = map_product("https://item.jd.com/1.html", {
            "title": "商品",
            "video_candidates": [
                "https://jdvideo.jd.com/live/index.m3u8",
                "https://video.360buyimg.com/vod/demo.mp4",
            ],
        }, [])
        self.assertEqual(direct["video_link"], "https://video.360buyimg.com/vod/demo.mp4")
        self.assertNotIn("video_stream_unavailable", direct["warnings"])

        hls = map_product("https://item.jd.com/1.html", {
            "title": "商品",
            "video_candidates": ["https://jdvideo.jd.com/live/index.m3u8"],
        }, [])
        self.assertIsNone(hls["video_link"])
        self.assertIn("video_stream_unavailable", hls["warnings"])

        untrusted = map_product("https://item.jd.com/1.html", {
            "title": "商品",
            "video_url": "https://evil.test/demo.mp4",
        }, [])
        self.assertIsNone(untrusted["video_link"])

    def test_accepts_supported_direct_video_formats_and_rejects_too_long_links(self):
        for extension in ("mp4", "webm", "mov", "m4v", "ogv"):
            with self.subTest(extension=extension):
                product = map_product("https://item.jd.com/1.html", {
                    "title": "商品",
                    "video_url": f"https://jdvideo.jd.com/native/demo.{extension}",
                }, [])
                self.assertEqual(product["video_link"], f"https://jdvideo.jd.com/native/demo.{extension}")

        too_long = "https://jdvideo.jd.com/native/demo.mp4?token=" + "a" * 500
        product = map_product("https://item.jd.com/1.html", {
            "title": "商品", "video_url": too_long,
        }, [])
        self.assertIsNone(product["video_link"])
        self.assertIn("video_url_too_long", product["warnings"])

    def test_reads_upstream_gallery_video_and_video_named_jd_subdomain(self):
        product = map_product("https://item.jd.com/1.html", {
            "title": "商品",
            "gallery": [[{
                "type": "video",
                "size": "video",
                "url": "https://jvod.jd.com/material/original.mp4",
            }]],
        }, [])
        self.assertEqual(product["video_link"], "https://jvod.jd.com/material/original.mp4")

    def test_uses_real_raw_brand_when_upstream_single_attribute_list_is_empty(self):
        product = map_product("https://item.jd.com/1.html", {
            "title": "商品", "brand": " 京造 ", "attributes": [],
        }, [])
        self.assertEqual(product["attributes"], [{"name": "品牌", "value": "京造"}])

        existing = map_product("https://item.jd.com/1.html", {
            "title": "商品", "brand": "重复品牌",
            "attributes": [{"name": "品牌", "value": "页面品牌"}],
        }, [])
        self.assertEqual(existing["attributes"], [{"name": "品牌", "value": "页面品牌"}])

    def test_native_dom_gallery_overrides_upstream_synthetic_size_urls(self):
        original = "https://img10.360buyimg.com/n1/s228x228_jfs/native.jpg.avif?sku=1"
        product = map_product("https://item.jd.com/1.html", {
            "title": "商品",
            "native_gallery": [original, original],
            "gallery": [[
                {"type": "image", "size": "1440", "url": "https://img10.360buyimg.com/n1/s1440x1440_jfs/native.jpg.avif?sku=1"},
                {"type": "image", "size": "800", "url": "https://img10.360buyimg.com/n1/s800x800_jfs/native.jpg.avif?sku=1"},
            ]],
        }, [])
        self.assertEqual(product["images"], [original])

    def test_rejects_missing_title_and_non_finite_prices(self):
        with self.assertRaises(ContractError) as raised:
            map_product("https://item.jd.com/1.html", {}, [])
        self.assertEqual(raised.exception.code, "extraction_failed")

        for value in (math.nan, math.inf, -1):
            product = map_product("https://item.jd.com/1.html", {"title": "商品", "price": value}, [])
            self.assertIsNone(product["price"])


if __name__ == "__main__":
    unittest.main()
