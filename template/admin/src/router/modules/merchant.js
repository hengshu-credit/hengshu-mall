import LayoutMain from '@/layout';
import setting from '@/setting';
export default {
  path: setting.routePre + '/merchant', name: 'merchantManagement', header: 'merchantManagement', component: LayoutMain,
  meta: { title: '商户', auth: ['admin-merchant-management'] }, redirect: { name: 'merchantShopList' },
  children: [
    { path: 'shop/list', name: 'merchantShopList', meta: { title: '商户列表', auth: ['merchant-management-page-shop'] }, component: () => import('@/pages/merchant/index') },
    { path: 'application/list', name: 'merchantApplications', meta: { title: '入驻申请', auth: ['merchant-management-page-application'] }, component: () => import('@/pages/merchant/applications') },
    { path: 'type/list', name: 'merchantTypes', props: { kind: 'type' }, meta: { title: '商户类型', auth: ['merchant-management-page-type'] }, component: () => import('@/pages/merchant/dictionary') },
    { path: 'tag/list', name: 'merchantTags', props: { kind: 'tag' }, meta: { title: '商户标签', auth: ['merchant-management-page-tag'] }, component: () => import('@/pages/merchant/dictionary') },
  ],
};
