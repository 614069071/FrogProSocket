// components/header/header.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    title: {
      type: String,
      value: '七分钱支付'
    },
    isBackHide: {
      type: Boolean,
      value: true
    },
  },
  methods: {
    goToBack() {
      wx.navigateBack();
    }
  }
})
