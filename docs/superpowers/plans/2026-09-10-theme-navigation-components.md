# Theme navigation and category components

Goal: Put navigation in each page's basic component library and make category editing use the same rectangular canvas and content/style panel pattern as the theme editor.

Execution: Continue in the current checkout and session. Do not delegate or create branches. Preserve earlier JD/media/deployment changes.

- [x] Add shared component defaults and style rendering compatible with the existing detail-page common-style controls. Support original menu icons/links and migrate old footer settings.
- [x] Register a navigation preview/config component in the existing DIY library. Load and save one optional navigation per home/detail/user page, including hide/delete and old data compatibility. Redirect the old standalone editor into the theme editor.
- [x] Split category editing into search, category 1/2/3, navigation and page settings; share navigation/common-style controls, remove the phone frame, preserve each layout's options when switching.
- [x] Save page navigation and category module styles in existing theme JSON. Resolve storefront navigation by current page and preview theme, reject invalid configuration, handle rapid route changes, and reserve space above action bars.
- [x] Verify real PHP service isolation/roundtrips, real Vue controls and production H5 rendering for page-specific navigation and all category layouts. Build admin/H5, create the combined archive and verify extraction/Compose startup.

Files: template/shared/componentStyle.js and mainNavigation.js; admin mobilePage/mobileConfig navigation components, devise/diyIndex.vue, theme/editTheme category modules; PHP ThemeServices/MainNavigationConfig/CategoryPageConfig; UniApp pageFooter/storeNavigation/category appearance; tests/regression and release docs.

Validation completed: PHP page isolation/style/layout roundtrips; real Vuex component registration and save-switch handling; production admin browser; production H5 all three category layouts with old and new navigation; native MP/APP component logic; stale-route response protection. Admin/H5 production builds passed. Combined archive extraction and real Compose/Nginx/Chromium/API/noVNC/profile-persistence verification passed.

Artifact: dist/hengshu-mall-update.tar.gz, 84,871,222 bytes.
SHA256: 669e82fe47ed4607046e8e10b66faac991781c66d99f3bf0c68f78891b31e17c.
Evidence: .build/theme-components/. No remote server deployment or native APP/mini-program release was performed.
