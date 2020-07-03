Page({
  data: {
    countTime: 12,
    type: 'refund',
    clear: false
  },
  onLoad() { },
  goToIndex() {//返回
    this.setData({ clear: true });
  },
  goToBack() {
    const pages = getCurrentPages();
    const recordPage = pages[pages.length - 2];
    if (recordPage && recordPage.data.isRefundBack !== undefined) {
      recordPage.setData({ isRefundBack: true });
    }
    wx.navigateBack({ delta: 1 });
  }
});
