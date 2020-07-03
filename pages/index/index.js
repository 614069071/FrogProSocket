const app = getApp();
import utils from '../../utils/util.js';
import fetch from '../../fetch/index.js';
let rnum = 0;

Page({
  data: {
    mchOrderId: '',
    bannerList: ['/images/banner4.jpg'],
    // 支付相关
    paymentHide: true,
    amount: '0',
    autoplay: true,
    isSocialSecurityTipsHidden: true,//刷医保
    isSocialSecurityDetailHidden: true,//费用明细列表
    isSocialSecurityDetailList: new Array(3).fill({ Name: "测试产品1", Des: "测试描述1", Num: 1, Price: 0.01, Amount: 0.01 }),
    snTypeInfo: {}
  },
  onLoad() {
    const self = this;
    const info = app.getCacheInfo();

    this.launchMpApp(info.mchPrivatekey);
    this.onKeyBoardHandle();
    utils.getSavedFileList()
      .then(arr => {
        console.log(arr, 'images list');
        const list = arr.length ? arr : ['/images/banner4.jpg'];
        self.setData({ bannerList: list });
      })

    utils.faceSendMes({ type: 'hideLoading' });
    console.log('index onload app.cacheInfo:', app.getCacheInfo());
  },
  onShow() {
    rnum = 0;
    console.log('index onshow  app.cacheInfo:', app.getCacheInfo());
  },
  goToCodePayInit() {
    wxfaceapp.listenCodePayment({
      success() {
        wxfaceapp.onCodePayEvent(() => {
          console.log('listenCodePaymentInit oncode');
        })
      },
      fail(err) {
        console.log('index扫码支付失败', err);
      }
    })
  },
  onKeyBoardHandle() {
    const self = this;

    wxfaceapp.onRemoteMessage(function (res) {
      const data = JSON.parse(res.content) || {};
      console.log('后屏发送消息为：', data);
      // 接受到消息后，打开收银页面
      if (data.type === 'pay') {//支付
        const { amount = '', FeeItems = [], snTypeInfo = {} } = data;
        self.setData({ autoplay: false, isSocialSecurityDetailHidden: false, amount, isSocialSecurityDetailList: FeeItems });//显示支付页
        self.snTypeInfo = snTypeInfo || {};
      } else if (data.type == 'cancel') {//取消支付
        self.setData({ paymentHide: true, isSocialSecurityDetailHidden: true, isSocialSecurityTipsHidden: true, autoplay: true });
        self.goToCodePayInit();
      } else if (data.type === 'reload') {//重载页面
        wx.reLaunch({ url: '/pages/index/index' });
        app.setCacheInfo();
      } else if (data.type === 'healthCare') {
        self.setData({ isSocialSecurityTipsHidden: false, autoplay: false });
        self.scanHealthCare(data);
      }
    });
  },
  launchMpApp(mchPrivatekey) {
    const { appId, hostAppId, miniappType } = app.globalData.backAppInfo;
    let path = mchPrivatekey ? "/pages/keyboard/keyboard" : "/pages/login/login";

    wxfaceapp.launchMp({
      appId, hostAppId, miniappType, launchPage: path, needLogin: 0,
      success(res) {
        console.log('index开启后屏收银成功')
      },
      fail(err) {
        console.log(err, 'index开启后屏收银失败')
      }
    })
  },
  goToCancel(mes = '') {
    this.setData({ paymentHide: true, autoplay: true });
    this.goToCodePayInit();
    const data = JSON.stringify({ type: 'cancel', mes });
    utils.faceSendMes(data);
  },
  // 扫码支付（二维码支付）
  goToCodePay() {
    const self = this;
    wxfaceapp.listenCodePayment({
      success() {
        wxfaceapp.onCodePayEvent((res) => {
          console.log('listenCodePaymentDefault oncode');
          const qrCode = res.code;
          const data = { codeType: 'C', barCode: qrCode };

          self.startCashier(data);
        })
      },
      fail(err) {
        console.log('扫码支付失败', err);
        utils.faceSendMes({ type: 'cancel', mes: '扫码支付失败' });
      }
    })
  },
  // 刷脸支付
  goToFacePay: utils.throttle(function () {
    const self = this;
    wxfaceapp.facePay({
      requireFaceCode: true,
      success() {
        //刷脸成功 event
        wxfaceapp.onFacePayPassEvent(function (r) {
          console.log('刷脸成功:', r);
          const { faceCode } = r;
          const data = { codeType: 'F', barCode: faceCode };

          self.startCashier(data);
        });

        wxfaceapp.onFacePayFailedEvent(function (r) {
          console.log('刷脸失败:', r);
        });
        wxfaceapp.onQueryPaymentSucEvent(function (r) {
          console.log('查单成功:', r);
        });
        wxfaceapp.onQueryPaymentFailedEvent(function (r) {
          console.log('查单失败:', r);
        });
      },
      fail(err) {
        console.log('刷脸失败', err);
        utils.faceSendMes({ type: 'cancel', mes: '刷脸支付失败' });
      }
    })
  }),
  // 支付流程
  startCashier({ codeType, barCode }) {
    const self = this;
    const mchOrderId = "QM" + new Date().getTime() + utils.getRandom(10);
    const params = { orderTimestamp: new Date().getTime() };
    const amount = this.data.amount;

    fetch
      .getTimeStamp(params)
      .then(res => {
        const { data } = res;
        const dataCard = { codeType, mchOrderId, authCode: barCode, orderTimestamp: data, orderAmt: amount };

        self.cardPayEvent(dataCard);
      })
  },
  //聚合支付（刷卡支付api）
  cardPayEvent(paramObj) {
    console.log('聚合支付 1');
    const wxReg = /^1[012345]\d{16}$/;
    const alipayReg = /((^2[56789]\d{14,22}$)|(^30\d{14,22}$))/;
    const unionpayReg = /^62[0-9A-Za-z]*$/;
    let channel = "alipay";
    let upayType = "SK";
    const self = this;

    // 商户信息
    if (wxReg.test(paramObj.authCode)) {
      //微信付款
      channel = "wx";
    } else if (alipayReg.test(paramObj.authCode)) {
      //支付宝
      channel = "alipay";
    } else if (unionpayReg.test(paramObj.authCode)) {
      //云闪付
      channel = "unionpay";
    } else {
      console.log('authCode', authCode);
      // 暂不支持
      wx.showToast({
        title: '暂不支持该支付类型',
        success() {
          self.goToCancel('暂不支持该支付类型');
        }
      });
      return;
    }
    if (paramObj.codeType == 'F') {
      upayType = "SL";
    }

    const { deviceFlag, version } = app.globalData;
    const info = app.getCacheInfo();
    const { terminalNo = '', mchId = '', shopId = '', cashierId = '', shopName = '', role = '', userName = '' } = info;
    let cashierMobile = '';

    if (role == 'cashier') {
      cashierMobile = userName || '';
    }
    if (role == 'ent') {
      cashierMobile = ''
    }

    const data = {
      deviceFlag, version, service: 'qing_wa', channel, cashierMobile, mchId, shopId, cashierId, terminalNo,
      merchantName: shopName, prodName: shopName, prodDesc: shopName, payType: upayType, orderTimeOut: 5000
    };

    const fullParam = Object.assign({}, paramObj, data);
    const faceSendData = { type: 'result', result: '', orderAmt: paramObj.orderAmt, mchOrderId: paramObj.mchOrderId, channel, ...self.snTypeInfo };

    self.setData({ paymentHide: true, autoplay: true });
    self.goToCodePayInit();

    fetch
      .gateway(fullParam)
      .then(res => {
        const { returnCode, needQuery } = res.data;
        const { orderAmt } = fullParam;

        if (returnCode === 'SUCCESS') {
          faceSendData.result = 'result';
          utils.faceSendMes(faceSendData);
        } else {
          if (needQuery == "Y") {
            utils.faceSendMes({ type: 'result', result: 'tradingQuery', mes: '支付结果查询中,请稍等...' });

            const payResData = { mchOrderId: paramObj.mchOrderId, orderAmt, codeType: paramObj.codeType, channel, ...self.snTypeInfo };
            self.getPayRes(payResData);
          } else {
            faceSendData.result = 'fail';
            utils.faceSendMes(faceSendData);
          }
        }
      })
      .catch((err) => {
        faceSendData.result = 'fail';
        utils.faceSendMes(faceSendData);
        console.log('cardPayEvent err', err);
      })
  },
  //轮询获取交易结果
  getPayRes(obj) {
    console.log('轮询获取交易结果');
    const self = this;
    const { mchOrderId } = obj;
    const { version } = app.globalData;
    const info = app.getCacheInfo();
    const { terminalNo, mchId } = info;
    const param = { version, mchId, terminalNo, mchOrderId, service: 'mch.query.orderstatus' };
    const sendSocketData = { type: 'result', result: '', orderAmt: obj.orderAmt, mchOrderId: obj.mchOrderId, channel: obj.channel, ...self.snTypeInfo };

    fetch
      .gateway(param)
      .then(res => {
        const { returnCode, tradeStatus } = res.data;

        if (returnCode === "SUCCESS") {
          if (tradeStatus === "TRADE_SUCCESS") {
            clearTimeout(resTimer);
            sendSocketData.result = 'result';
            utils.faceSendMes(sendSocketData);
          }
          if (tradeStatus === "BUYER_PAYING") {
            rnum++;
            if (rnum < 7) {
              resTimer = setTimeout(function () {
                self.getPayRes(obj)
              }, 3000)
            } else {
              // 查询超时,跳转至等待处理中页面
              clearTimeout(resTimer);
              sendSocketData.result = 'processing';
              utils.faceSendMes(sendSocketData);
            }
          }
          if (tradeStatus === "TRADE_CLOSED") {
            clearTimeout(resTimer);
            sendSocketData.result = 'fail';
            utils.faceSendMes(sendSocketData);
          }
        } else {
          clearTimeout(resTimer);
          sendSocketData.result = 'fail';
          utils.faceSendMes(sendSocketData);
        }
      })
  },
  socialPayment() {
    this.setData({ isSocialSecurityDetailHidden: true, paymentHide: false });
    this.goToCodePay();
    console.log('医保支付');
  },
  hideGoLogin() {
    utils.manyClickExecute(() => {
      wx.redirectTo({ url: '/pages/keyboard/keyboard' });
    })
  },
  scanHealthCare(data) {
    console.log('scanHealthCare', data);
  }
})