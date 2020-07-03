import fetch from './fetch/index.js';
import * as request from './fetch/request.js';
import utils from './utils/util.js';
import { appId, hostAppId, miniappType, deviceFlag, version } from './config';
import rsaSign from './utils/rsaSign.js';
import CommandTiny from './utils/command';

// console.log = function () { }

// pro: TXAP11939007428ND002112  新 TXAP11951002379ND002112
// utils.fsm.set({ terminalNo: 'TXAP11951002379ND002112' });//测试账号

App({
  globalData: {
    refundInfo: {},
    bannerArr: ['/images/banner4.jpg'],
    backAppInfo: { appId, hostAppId, miniappType },
    frontAppInfo: { appId },
    deviceFlag,
    version
  },
  cacheInfo: {},
  onLaunch() {
    let isDebug;
    if (appId === 'wx5797cc3edc495083') {
      isDebug = true;
    } else {
      isDebug = miniappType ? true : false;
    }

    CommandTiny.installApp(this);
    const info = utils.fsm.get();
    wx.setEnableDebug({ enableDebug: isDebug });
    this.setCacheInfo(null, info);
    // socket （待改 在背屏开启）
    // utils.socket.handSocketEvents();
    // utils.socket.startConnectSocket();
    this.getDeviceProp(info);
  },
  onHide() {
    console.log('app onHide');
  },
  //获取设备序列号
  getDeviceProp(info) {
    const self = this;
    wxfaceapp.checkWxFacePayOsInfo({
      success(res) {
        const { terminalNo = '', mchId = '', mchPrivatekey = '' } = info;
        const { osSerialNumber, screenInfo } = res;
        const bannerUpdateInfo = { terminalNo, mchId, mchPrivatekey };
        const data = { terminalNo: osSerialNumber };

        console.log(info, 'app info');
        console.log(res, '设备信息');

        if (screenInfo === 'back-screen') {
          utils.socket.handSocketEvents();
          utils.socket.startConnectSocket();
          self.onRemoteMegHandle();
          utils.removeSavedFile();
          self.updateBanner(bannerUpdateInfo);
        }

        if (terminalNo) return;

        utils.fsm.set(data, () => {
          self.setCacheInfo(null, data);
        });
      },
      fail(err) {
        console.log('获取设备号失败', err);
      }
    })
  },
  // 更新banner
  updateBanner(info) {
    const { deviceFlag, version } = this.globalData;
    const { terminalNo = '', mchId = '', mchPrivatekey = '' } = info;
    const params = { mchId, terminalNo, deviceFlag, version, service: 'mch_get_advertisement' };

    if (!mchPrivatekey) return;

    fetch
      .gateway(params)
      .then((res) => {
        const { returnCode = '', machineAdvert = '[]' } = res.data;
        const imagesArr = JSON.parse(machineAdvert || '[]') || [];

        if (returnCode !== 'SUCCESS' || !imagesArr.length) return;

        const list = utils.sort(imagesArr).map(ele => decodeURIComponent(ele.picture)); // 排序 转码

        // 下载图片存储在本地
        utils.downloadFile(list)
          .then(res => {
            console.log(res, 'app update banner downloadFile success');
            utils.faceSendMes({ type: 'reload' });
          })
      })
  },
  // 写入缓存数据
  setCacheInfo(callback, data) {
    const cache = data || utils.fsm.get();
    // console.log(cache, data, 'app setCacheInfo cache');
    request.install(cache);
    rsaSign.install(cache.qfqPublickey);
    utils.install(cache);
    this.cacheInfo = cache;
    callback && callback(cache);
  },
  getCacheInfo() {
    if (Object.keys(this.cacheInfo).length) {
      console.log('cache from app');
      return this.cacheInfo;
    } else if (Object.keys(utils.fsm.get()).length) {
      const info = utils.fsm.get();
      console.log('cache from fsm');
      this.setCacheInfo(null, info);
      return info;
    } else {
      console.log('cache from null');
      return {}
    }
  },
  // 监听前屏消息
  onRemoteMegHandle() {
    wxfaceapp.onRemoteMessage(function (res) {
      const currenThis = utils.getCurrentThis();//当前页面page
      const data = JSON.parse(res.content);
      currenThis.setData({ isMaskHide: true, isOpenCountdown: false });

      console.log('开启全局监听 onRemoteMegHandle currenThis', currenThis);

      let dealChannel = data.channel === 'wx' ? 'wechat' : data.channel;

      if (data.type === 'result') {//支付结果
        const { snTypeInfo = {} } = data;
        const replyContent = {
          code: 'command',
          value: {
            reqNo: snTypeInfo.reqNo || '', //请求号
            Status: "", //是否提交处理 0 成功 -1失败
            // Msg: "",//返回消息 成功不传
            BusinessStatus: "",//业务状态 0成功 -1失败 1取消
            tradeno: data.mchOrderId,//交易单号，发起支付后回调必须，其他方法不需要
            Amount: data.orderAmt,//金额
            // refundNo: "",//退款单号
            payment: dealChannel//支付渠道 alipay: 'alipay',wx: 'wechat',unionpay: 'unionpay'
          }
        }

        if (data.result === 'tradingQuery') {//交易查询中
          currenThis.setData({ maskTips: data.mes });
        } else {
          if (data.result === 'result') {
            replyContent.value.Status = 0;
            replyContent.value.BusinessStatus = 0;
            wx.navigateTo({ url: `/pages/result/result?amount=${data.orderAmt}` });
          } else if (data.result === 'fail') {
            replyContent.value.Status = -1;
            replyContent.value.BusinessStatus = -1;
            wx.navigateTo({ url: "/pages/fail/fail" });
          } else if (data.result === 'processing') {
            replyContent.value.Status = 0;
            replyContent.value.BusinessStatus = 0;
            wx.navigateTo({ url: "/pages/processing/processing" });
          }
          console.log('login replyContent', replyContent);
          if (snTypeInfo.snType == 1) {//socket
            utils.socket.sendSocketMessage(replyContent);
          }
        }
      } else if (data.type === 'cancel') {
        wx.navigateTo({ url: `/pages/cancel/cancel?mes=${data.mes}` });
      } else if (data.type === 'hideLoading') {
        currenThis.setData({ isMaskHide: true });
      }
    });
  }
})