import fetch from '../../fetch/index.js';
import utils from '../../utils/util.js';

const app = getApp();
let socketTimer = null;

Page({
  data: {
    role: '',
    countTime: 30,
    isOpenCountdown: false,
    isMaskHide: true,
    maskTips: '等待用户支付…'
  },
  onLoad(ops) {
    // console.log(role, 'setting onload ops');
    const cacheInfo = app.getCacheInfo();
    const role = ops.role ? ops.role : cacheInfo.role;
    this.setData({ role });
  },
  onShow() {
    // console.log('setting app.cacheInfo:', app.getCacheInfo());
    this.setData({ clear: true });
  },
  //退出登录请求
  logoutRequest() {
    const { deviceFlag, version } = app.globalData;
    const info = app.getCacheInfo();
    const { role, userName, mchId, terminalNo } = info;
    let obj = { deviceFlag, version, role, userName, mchId, terminalNo, service: 'mch_logout' };
    let params = Object.assign({}, obj);

    try {
      fetch
        .gateway(params)
        .then(res => {
          let tips = res.data.returnCode == "SUCCESS" ? '退出登录成功！' : '请重新登录';

          wx.showToast({
            icon: 'success',
            title: tips,
            success: () => {
              wx.reLaunch({ url: '/pages/login/login' });
            }
          })
        })
        .catch(() => {
          wx.reLaunch({ url: '/pages/login/login' });
        })
    } catch (e) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },
  // 退出
  goToExit() {
    const self = this;
    wx.showModal({
      content: '是否退出登录？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          self.logoutRequest();
        }
      },
    });
  },
  // 更新banner图
  goToUpdateBanner() {
    const self = this;
    wx.showModal({
      content: '是否更新广告',
      showCancel: true,
      cancelText: '取消',
      confirmText: '确认',
      success({ confirm }) {
        if (!confirm) return;
        self.updateBanner();
      }
    })
  },
  //更新广告
  updateBanner() {
    wx.showToast({
      title: '广告更新中。。。',
      duration: 10000
    });

    const self = this;
    const { deviceFlag, version } = app.globalData;
    const info = app.getCacheInfo();
    const { terminalNo = '', mchId = '', mchPrivatekey = '' } = info;
    let params = { mchId, terminalNo, deviceFlag, version, service: 'mch_get_advertisement' };

    if (!mchPrivatekey) {
      wx.showToast({
        title: '请先登录',
        duration: 1500,
        success() {
          wx.reLaunch({ url: '/pages/login/login' });
        }
      });
      return;
    }

    fetch
      .gateway(params)
      .then((res) => {
        // wx.hideLoading();

        const { returnCode = '', machineAdvert = '[]' } = res.data;

        if (returnCode == 'SUCCESS') {
          const imagesArr = JSON.parse(machineAdvert || '[]') || [];

          if (!imagesArr.length) {
            wx.showToast({ title: '暂无更新' });
            return;
          }

          const list = utils.sort(imagesArr).map(ele => decodeURIComponent(ele.picture));    // 排序 转码
          console.log(list, 'list');
          utils.removeSavedFile();
          // 下载图片存储在本地
          utils.downloadFile(list)
            .then(res => {
              wx.showToast({ title: '更新成功' });

              console.log(res, 'setting downloadFile success');

              utils.faceSendMes({ type: 'reload' });
            })
        } else {
          wx.showToast({ title: '更新失败' });
        }
      })
      .catch((err) => {
        wx.showToast({ title: '更新失败' });
      })
  },
  startConnectSocket() {
    utils.socket.closeSocket();
    utils.socket.ManualOpenSocketModel = true;
    wx.showLoading({
      mask: true,
      title: '连接中',
      duration: 5000
    });
    utils.socket.startConnectSocket();
  }
});
