# H5 interaction performance

Execute inline in the existing Windows source checkout. Preserve previous changes, API contracts, UI and authentication behavior. No business response cache or additional source checkout.

- [x] Measure category entry through actual mobile UI, separating readiness, API sequence and long tasks. Use isolated login/cart fixtures so no real business writes occur.
- [x] Start independent category bootstrap reads together, share the one initial category response with the selected layout on H5, and prevent stale page refresh callbacks. Preserve fresh requests on subsequent refreshes and category version changes; keep non-H5 props serializable.
- [x] Remove theme/category global listeners on component destruction. Regress repeated mount/destroy cycles.
- [x] Handle rapid category changes with latest-request ownership, preserving pagination and preventing an old category response from replacing the current one.
- [x] Batch category geometry reads; use native H5 visibility observation for lazy images with the existing non-H5 fallback and teardown. Preserve loading/error styles and image transition behavior.
- [x] Re-measure category entry and scroll activity, verify the three layouts, rapid switching, image visibility, event cleanup, automatically compiled source changes and isolated chat. Document measurements and limits.
- [x] After explicit authorization to change database indexes, profile the real PHP request and SQL separately. Add only supported category/language indexes with schema backup, idempotent application and ownership-scoped rollback. Verify execution plans, unchanged table rows and full API payload/order; document that database execution is a small fraction of current request time.
