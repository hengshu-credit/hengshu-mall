# Cart entry performance implementation plan

Execute inline in the existing Windows checkout under the user's ongoing performance request. The clarified symptom is waiting for content after navigation, with cart entry the priority. Preserve concurrent navigation changes, UI, authentication, cart contents, prices, selection and checkout behavior. Do not send real cart writes or alter real users for testing.

- [x] Inspect PHP class loading, SQL and cart entry. Current cart waits for counts and then fetches every page sequentially; its nested promise never settles on request failure.
- [x] Capture the current cart in an isolated Chrome session with fixed cart responses and delay. Record readiness and final DOM; capture console errors and request order.
- [x] Regress count/first-page concurrency, bounded pagination, response order, empty cart, failures, page revisits and teardown using the actual cart Vue script. Preserve real selection/total calculation methods in the test.
- [x] Change only cart loading/lifecycle methods in `template/uni-app/pages/order_addcart/order_addcart.vue`: initialize state before requests, run count/first page together, allow at most three list requests, publish complete ordered data once, and settle errors/ignore stale responses.
- [x] Repeat browser entry with the same fixtures and compare rows, prices and checked state; inspect the final screenshot and verify empty/invalid carts and selection totals. Run existing navigation/checkout-adjacent regression tests without real writes.
- [x] Record measured results and practical limits in `help/dev/README.md`. Keep classmap profiling as diagnosis unless a repeatable end-to-end benefit justifies a separate implementation.

Verified: `cart_loading.cjs`, `cart_browser.cjs after`, `config_requests.cjs`, `store_navigation_browser.cjs`, and `product_recommendations.cjs`. Under fixed API delays, 41 valid rows became ready in 1,519 ms versus 3,110 ms before; the updated page finished dismissing its existing loading mask at 1,885 ms. Row order, quantities, prices, checked state, invalid rows and totals matched exactly. The baseline screenshot still contained the dismissing mask, so no pixel-equality claim is made. This fixture isolates request scheduling and is not a measurement of the user's real cart. No template/style edits or real cart writes were made. Mini-program/App true-device behavior was not tested.

PHP runtime profiling found substantial class-loading cost, but the request-local classmap experiment did not yield a repeatable overall improvement. No production classmap or runtime settings were changed in this iteration.
