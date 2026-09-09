import Vue from 'vue';
import storeNavigation from '@/components/storeNavigation/index.vue';

export function installStoreNavigation(app) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const navigation = new Vue({ parent: app, render: h => h(storeNavigation) });
  navigation.$mount(host);
  app.$once('hook:beforeDestroy', () => {
    const element = navigation.$el;
    navigation.$destroy();
    element.remove();
  });
}
