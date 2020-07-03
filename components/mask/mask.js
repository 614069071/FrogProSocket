import utils from '../../utils/util';

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 提示文字
    maskTips: {
      type: String,
      value: '等待用户支付…'
    },
    // 倒计时时间
    countTime: {
      type: Number,
      value: 30
    },
    // 清除定时器
    isMaskHide: {
      type: Boolean,
      value: true
    },
    // 是否开启倒计时
    isOpenCountdown: {
      type: Boolean,
      value: false
    }
  },
  observers: {},
  methods: {
    goToCancel() {
      console.log('mask isMaskHide');
      this.setData({ isMaskHide: true });
      utils.faceSendMes({ type: 'cancel' });
      utils.onCancel && utils.onCancel();
    }
  }
})
