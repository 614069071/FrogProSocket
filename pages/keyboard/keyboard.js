const app = getApp();
import utils from '../../utils/util';

let resTimer = null;
let rnum = 0;
const reg = /(^[1-9][0-9]{0,4}([.][0-9]{0,2})?$)|(^0?(\.[0-9]{0,2})?$)/;//校验金额正则

Page({
  data: {
    shopName: '',
    amount: '',
    username: '',
    role: '',
    // mask
    countTime: 30,
    isOpenCountdown: false,
    isMaskHide: true,
    maskTips: '等待用户支付…'
  },
  onLoad() {
    console.log('keyboard onload', app.getCacheInfo());
  },
  onShow() {
    this.update();
    // 监听前屏消息
    // this.onRemoteMegHandle();
    rnum = 0;
    resTimer = null;
    console.log('keyboard app.cacheInfo:', app.getCacheInfo());
  },
  onUnload() {
    rnum = 0;
    this.setData({ amount: '', isMaskHide: true, isOpenCountdown: false });
    wx.hideLoading();
    resTimer = null;
  },
  update() {
    const cacheInfo = app.getCacheInfo();
    const { shopName = '', cashierName = '', mchPrivatekey = '', role = '' } = cacheInfo;
    const username = cashierName.length ? `（${cashierName}）` : '';
    this.setData({ shopName, username, isMaskHide: true, amount: '', role });
    if (mchPrivatekey) return;
    wx.redirectTo({ url: '/pages/login/login' })
  },
  // 金额输入
  inputAmount(e) {
    const { key } = e.target.dataset;
    let { amount } = this.data;
    if (amount === '' && key === '.') {
      amount = '0.';
      this.setData({ amount });
    }
    amount += key;
    const flag = reg.test(amount);
    if (!flag) return;
    this.setData({ amount });
  },
  // 删除金额
  deleteAmount() {
    let { amount } = this.data;
    if (!amount.length) return;
    amount = amount.slice(0, -1);
    this.setData({ amount });
  },
  // 付款
  goToPayment() {
    const self = this;
    let { amount } = this.data;

    if (!parseFloat(amount)) return;//金额为0.00 | 0.0 | 0

    utils.onCancel = () => {
      console.log('keyboard 手动取消');
    }

    const data = JSON.stringify({ type: 'pay', amount });

    utils.faceSendMes(data, function () {
      self.setData({ amount: '', isMaskHide: false, clear: false });
    }, function () {
      wx.showToast({ title: '收款失败' });
    });
  },
  // 取消支付
  goToCancle() {
    this.setData({ isMaskHide: true, isOpenCountdown: false, countTime: 30 });
    utils.faceSendMes({ type: 'cancel' });
  },
  // 初始化页面
  resProcess() {
    this.setData({ isMaskHide: true, isOpenCountdown: false, clear: true, countTime: 30 });
  },
  // 超额支付场景
  hideLoading() {
    console.log('hideLoading');
    this.setData({ isMaskHide: true, countTime: 30, isOpenCountdown: false });
  }
})