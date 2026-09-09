# Generated media fixtures

These tiny fixtures are locally generated solid-color images and silent videos, not captured JD material. They test preservation of encoded bytes, container identification and upload paths without a browser, database or storage account.

- Images: Pillow 11.2.1; AVIF uses pillow-avif-plugin. A 16×16 RGB image `(31,127,223)` was saved directly as AVIF, JPEG, WebP, GIF, BMP and ICO.
- Videos: FFmpeg with `-f lavfi -i color=c=blue:s=16x16:d=0.2 -pix_fmt yuv420p`; WebM uses `libvpx-vp9`, MOV/M4V use `libx264`, OGV uses `libtheora`.
- Legacy video samples use a 32×32 blue source: AVI `mpeg4`, WMV `wmv2`, RM `rv10`, MPG `mpeg1video`, FLV `flv`.
- The MP4 regression also reads the existing SDK sample in `crmeb/vendor/alipaysdk/easysdk/php/test/resources/fixture/sample.mp4`.

Tests require only PHP extensions already present in the PHP 7.4 application image. Encoders are not runtime dependencies.

SVG fixtures are inline in the test. Safe static SVG is accepted without rewriting. Script/event handlers, external resources, DTD/entity declarations, foreignObject, animation, processing instructions and CSS `<style>` sheets are rejected. A restricted inline `style` attribute and local fragment references are supported. Common export/accessibility attributes remain byte-identical.

The tests replace cloud HTTP transport; real bucket policy, MIME behavior and browser-direct uploads using temporary cloud credentials require separate integration checks. Container validation does not decode every video frame or transcode files. SWF is excluded because it is executable Flash content, not a native product video format.
