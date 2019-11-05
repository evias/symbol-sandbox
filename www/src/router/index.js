import Vue from 'vue';
import Router from 'vue-router';
import WelcomeScreen from '@/components/WelcomeScreen';
import QRCodesScreen from '@/components/qr-codes/Screen';
import WalletScreen from '@/components/wallet/Screen';
import ValidatorScreen from '@/components/validator/Screen';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'WelcomeScreen',
      component: WelcomeScreen,
    },
    {
      path: '/qrcodes',
      name: 'QRCodesScreen',
      component: QRCodesScreen,
    },
    {
      path: '/wallet',
      name: 'WalletScreen',
      component: WalletScreen,
    },
    {
      path: '/validator',
      name: 'Validator',
      component: ValidatorScreen,
    },
  ],
});
