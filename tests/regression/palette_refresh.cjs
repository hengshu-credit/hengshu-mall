const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { root, transform } = require("./theme_component_harness.cjs");
const m = { exports: {} };
new Function(
  "module",
  "exports",
  transform(
    fs.readFileSync(
      path.join(root, "template/shared/paletteRefresh.js"),
      "utf8"
    )
  )
)(m, m.exports);
(async () => {
  const pending = [],
    applied = [];
  let time = 0;
  const refresh = m.exports.createPaletteRefresher(
    (id) =>
      new Promise((resolve, reject) => pending.push({ id, resolve, reject })),
    (v) => applied.push(v),
    () => time
  );
  const first = refresh(2),
    same = refresh(2);
  assert.equal(first, same);
  await Promise.resolve();
  const next = refresh(3);
  await Promise.resolve();
  pending[1].resolve("blue");
  await next;
  pending[0].resolve("red");
  await first;
  assert.deepEqual(
    applied,
    ["blue"],
    "Old preview response must not overwrite the current theme"
  );
  await refresh(3);
  assert.equal(pending.length, 2);
  time = 2000;
  const fail = refresh(3);
  await Promise.resolve();
  pending[2].reject(new Error("offline"));
  await assert.rejects(fail);
  assert.deepEqual(applied, ["blue"]);
  const retry = refresh(3);
  await Promise.resolve();
  pending[3].resolve("green");
  await retry;
  assert.deepEqual(applied, ["blue", "green"]);
  console.log(
    "PASS theme refresh concurrency, preview isolation, throttling and offline recovery"
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
