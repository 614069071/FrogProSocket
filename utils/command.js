import fetch from '../fetch/index.js';
import utils from './util.js';
import config from '../config';

/*
 * socket 待解决问题点:
 * 1.心跳
 */


let _app = null;

const installApp = app => {
  _app = app;
}

/* 
指令调用成功返回消息格式
{
  reqNo: "", //请求号
  Status: "", //处理状态 0 成功 -1失败 1 取消 (同status字段)
  Msg: "",//返回消息 成功不传
  BusinessStatus: "",//业务状态 0成功 -1失败 1取消
  tradeno: '',//交易单号，发起支付后回调必须，其他方法不需要
  Amount: "",//金额
  refundNo: "",//退款单号
  payment: ''//支付渠道 alipay: 'alipay',wx: 'wechat',unionpay: 'unionpay'
} 
*/
// 处理 指令消息
const command = data => {
  console.info('commondTiny', data);

  switch (data.deliveryType.toString()) {
    case '1':
      console.info('支付', data);// √
      goToPayment(data);
      break;
    case '3':
      console.info('取消支付');// √
      goToCancel(data);
      break;
    case '4':
      console.info('退款', data);// √
      goToRefund(data);
      break;
    case '5':
      console.info('设置');// √
      goToSetting(data);
      break;
    case '6':
      console.info('电子医保');
      goToHealthCare(data);
      break;
    case '7':
      console.info('登录', data);// √
      goToLogin(data);
      break;
    default:
      console.info('default', data);// √ 其他消息
  }
}

// 支付 1
function goToPayment(info) {
  const currenThis = utils.getCurrentThis();
  const route = currenThis.route.split('/').pop();
  const replyContent = {
    code: 'command',
    value: {
      reqNo: info.reqNo, //请求号
      Status: 0, //处理状态 0 成功 -1失败 1 取消 (同status字段)
      Msg: "未登录",//返回消息 成功不传
      BusinessStatus: 0,//业务状态 0成功 -1失败 1取消
      // tradeno: '',//交易单号，发起支付后回调必须，其他方法不需要
    }
  }

  // 订单号:orderNo   请求编号:reqNo
  let { Amount = 0, orderNo = '', reqNo = '', FeeItems = [] } = info;

  if (!parseFloat(Amount)) return;//金额为0.00 | 0.0 | 0

  // snTypeInfo 操作信息
  // snType 自定义操作类型 0 手动操作 1 socket操作 2 串口连接
  const data = JSON.stringify({ type: 'pay', amount: Amount, FeeItems, snTypeInfo: { snType: 1, orderNo, reqNo } });

  if (route === 'login') {
    wx.showToast({ title: '未登录' });
    replyContent.value.Status = 1;
    replyContent.value.BusinessStatus = 1;
    utils.socket.sendSocketMessage(replyContent);
    return;
  }

  utils.onCancel = () => {
    console.log('我是手动取消');
    replyContent.value.Status = 1;
    replyContent.value.BusinessStatus = 1;
    replyContent.value.Msg = '已手动取消支付';
    utils.socket.sendSocketMessage(replyContent);
  }

  utils.faceSendMes(data, function () {
    currenThis.setData({ isMaskHide: false });
  }, function () {
    currenThis.setData({ isMaskHide: true });
    replyContent.value.Status = 1;
    replyContent.value.BusinessStatus = 1;
    replyContent.value.Msg = '前屏未开启';
    utils.socket.sendSocketMessage(replyContent);
    wx.showToast({ title: '前屏未开启' });
  });
}

// 取消(支付) 3
function goToCancel(info) {
  const currenThis = utils.getCurrentThis();
  const route = currenThis.route.split('/').pop();
  const replyContent = {
    code: 'command',
    value: {
      reqNo: info.reqNo, //请求号
      Status: 0, //处理状态 0 成功 -1失败 1 取消
      // Msg: "",//返回消息 成功不传
      BusinessStatus: 0//业务状态 0成功 -1失败 1取消
    }
  };
  if (route === 'login') {
    //登录页面
    wx.showToast({ title: '请先登录' });
    replyContent.value.Status = -1;
    replyContent.value.BusinessStatus = -1;
    replyContent.value.Msg = '未登录';
    utils.socket.sendSocketMessage(replyContent);
  } else {
    //其他页面（设置、交易列表、详情）
    currenThis.setData({ isMaskHide: true });
    utils.faceSendMes({ type: 'cancel' }, () => {
      replyContent.value.Status = 0;
      replyContent.value.BusinessStatus = 0;
      utils.socket.sendSocketMessage(replyContent);
    }, () => {
      replyContent.value.Status = -1;
      replyContent.value.BusinessStatus = -1;
      replyContent.value.Msg = '前屏未开启';
      utils.socket.sendSocketMessage(replyContent);
    });
  }
}

// 退款 4
function goToRefund(data) {
  wx.showLoading({ title: '退款中...' });
  // orderNo:订单号  Amount:退款金额 Secretkey:退款密码
  const { orderNo = '', Amount = '', Secretkey = '' } = data;
  const { deviceFlag, version } = config;
  const { mchId = '', shopId = '', userName = '', role = '', terminalNo = '' } = _app.getCacheInfo();
  const mchRefundId = "RQM" + new Date().getTime() + utils.getRandom(10);
  const replyContent = {
    code: 'command',
    value: {
      reqNo: data.reqNo, //请求号
      Status: 0, //处理状态 0 成功 -1失败 1 取消 (同status字段)
      // Msg: "",//返回消息 成功不传
      BusinessStatus: 0,//业务状态 0成功 -1失败 1取消
      Amount: data.Amount,//金额
      refundNo: mchRefundId,//退款单号
    }
  };

  let params = {
    service: 'mch.refund', version, deviceFlag, mchId, shopId, refundPwd: Secretkey,
    userName, role, mchOrderId: orderNo, mchRefundId, refundAmt: Amount, refundDes: '退款', terminalNo //终端号
  };

  fetch
    .gateway(params)
    .then(res => {
      wx.hideLoading();
      const { returnCode = '', returnMsg = '' } = res.data;
      if (returnCode == "SUCCESS") {
        wx.navigateTo({ url: '/pages/refund/refund?amount=' + orderAmt });
        utils.socket.sendSocketMessage(replyContent);
      } else {
        if (returnCode == "PROCESSING") {
          utils.socket.sendSocketMessage(replyContent);
          wx.navigateTo({ url: "/pages/processing/processing?type=refund" })
        } else {
          replyContent.value.Status = -1;
          replyContent.value.BusinessStatus = -1;
          utils.socket.sendSocketMessage(replyContent);
          wx.navigateTo({ url: `/pages/fail/fail?type=refund&delta=1&Msg=${returnMsg}` })
        }
      }
    })
    .catch(err => {
      replyContent.value.Status = -1;
      replyContent.value.BusinessStatus = -1;
      utils.socket.sendSocketMessage(replyContent);
    })
}

// 设置 5
function goToSetting(data) {
  const currenThis = utils.getCurrentThis();
  const route = currenThis.route.split('/').pop();
  const replyContent = {
    code: 'command',
    value: {
      reqNo: data.reqNo, //请求号
      Status: "", //处理状态 0 成功 -1失败 1 取消
      // Msg: "",//返回消息 成功不传
      BusinessStatus: ""//业务状态 0成功 -1失败 1取消
    }
  }

  if (route === 'setting') {
    replyContent.value.Status = 1;
    replyContent.value.BusinessStatus = 1;
    replyContent.value.Msg = '当前已处于设置页';
    utils.socket.sendSocketMessage(replyContent);
  } else if (route === 'login') {
    replyContent.value.Status = 1;
    replyContent.value.BusinessStatus = 1;
    replyContent.value.Msg = '请先登录';
    console.log('replyContent', replyContent);
    utils.socket.sendSocketMessage(replyContent);
  } else {
    wx.navigateTo({
      url: '/pages/setting/setting',
      success() {
        replyContent.value.Status = 0;
        replyContent.value.BusinessStatus = 0;
        utils.socket.sendSocketMessage(replyContent);
      },
      fail() {
        replyContent.value.Status = -1;
        replyContent.value.BusinessStatus = -1;
        replyContent.value.Msg = '系统异常';
        utils.socket.sendSocketMessage(replyContent);
      }
    })
  }
}

// 医保 6
function goToHealthCare(data) {
  const { orderNo = '', reqNo = '' } = data;
  const replyContent = {
    code: 'command',
    value: {
      reqNo: data.reqNo, //请求号
      Status: "", //处理状态 0 成功 -1失败 1 取消
      // Msg: "",//返回消息 成功不传
      BusinessStatus: ""//业务状态 0成功 -1失败 1取消
    }
  }
  utils.faceSendMes({ type: 'healthCare', snTypeInfo: { snType: 1, orderNo, reqNo } }, () => {

  }, () => {
    replyContent.value.Msg = '前屏未开启';
    utils.socket.sendSocketMessage(replyContent);
  });
}

//  登录 7 info  socket传递的登录信息
function goToLogin(info) {
  wx.showLoading({ title: 'loading...' });

  // info.userName = info.userName.replace(/\s/g, '');
  const cacheInfo = _app.getCacheInfo();
  const { reqNo, LoginModel } = info;//LoginModel: { Role, passWord, userName }
  const { deviceFlag, version } = config;
  const terminalNo = _app.getCacheInfo().terminalNo || '';
  const obj = { terminalNo, deviceFlag, version, service: 'mch_login' };
  const params = Object.assign({}, { userName: LoginModel.userName, password: LoginModel.passWord, role: LoginModel.Role }, obj);
  const replyContent = {
    code: 'command',
    value: {
      reqNo: info.reqNo, //请求号
      Status: 0, //处理状态 0 成功 -1失败 1 取消
      // Msg: "",//返回消息 成功不传
      BusinessStatus: 0//业务状态 0成功 -1失败 1取消
    }
  }

  fetch
    .login(params)
    .then(res => {
      const {
        mchPrivatekey = '', qfqPublickey = '', returnCode = '', mchId = '',
        cashierId = '', shopId = '', shopName = '', refundAuth = '0', cashierName = ''
      } = res.data;

      const bannerUpdateInfo = { terminalNo, mchId, mchPrivatekey };

      if (returnCode && returnCode == "SUCCESS") {
        utils.removeSavedFile();

        const infoData = {};//存储账号数据

        infoData.mchId = mchId;
        infoData.mchPrivatekey = mchPrivatekey;//私钥
        infoData.qfqPublickey = qfqPublickey;//公钥
        infoData.userName = LoginModel.userName;
        infoData.cashierName = cashierName;//收银员名字
        infoData.role = LoginModel.Role || '';

        wx.showToast({
          icon: 'success',
          title: '登录成功！',
          success: () => {
            if (LoginModel.Role == "cashier") {//收银员
              infoData.cashierId = cashierId;
              infoData.shopId = shopId;
              infoData.shopName = shopName;
              infoData.refundAuth = refundAuth;

              const fileData = Object.assign({}, cacheInfo, infoData);

              utils.fsm.set(fileData, () => {
                wx.reLaunch({ url: '/pages/keyboard/keyboard' });//收银
                _app.setCacheInfo(function () {
                  replyContent.value.Status = 0;
                  replyContent.value.BusinessStatus = 0;
                  utils.socket.sendSocketMessage(replyContent);
                  loginUpdateBanner(bannerUpdateInfo);//登录更新图片
                }, fileData);
              });
            }
            if (LoginModel.Role == 'ent') {//商户
              infoData.cashierId = '';
              infoData.shopId = '';
              infoData.shopName = '';
              // 存储信息
              const fileData = Object.assign({}, cacheInfo, infoData);

              utils.fsm.set(fileData, () => {
                wx.reLaunch({ url: '/pages/shop/shop' });//门店选择
                _app.setCacheInfo(function () {
                  replyContent.value.Status = 0;
                  replyContent.value.BusinessStatus = 0;
                  utils.socket.sendSocketMessage(replyContent);
                  loginUpdateBanner(bannerUpdateInfo);//登录更新图片
                }, fileData);
              }, () => {
                replyContent.value.Status = 1;
                replyContent.value.BusinessStatus = 1;
                replyContent.value.Msg = '系统异常';
                utils.socket.sendSocketMessage(replyContent);
                console.log('登录写入文件失败');
              });
            }
          },
          fail() {
            replyContent.value.Status = -1;
            replyContent.value.BusinessStatus = -1;
            replyContent.value.Msg = '系统异常';
            utils.socket.sendSocketMessage(replyContent);
          }
        });
        return;
      }

      wx.showToast({
        icon: 'none',
        title: '登录失败 !'
      });
      replyContent.value.Status = -1;
      replyContent.value.BusinessStatus = -1;
      replyContent.value.Msg = '登录失败';
      utils.socket.sendSocketMessage(replyContent);
    })
    .catch(err => {
      wx.showToast({
        icon: 'none',
        title: '网络异常！',
        success: () => { }
      });
      replyContent.value.Status = -1;
      replyContent.value.BusinessStatus = -1;
      replyContent.value.Msg = '网络异常！';
      utils.socket.sendSocketMessage(replyContent);
    })
}

// 登录时更新广告
function loginUpdateBanner(info) {
  const { deviceFlag, version } = config;
  const { terminalNo = '', mchId = '', mchPrivatekey = '' } = info;
  let params = { mchId, terminalNo, deviceFlag, version, service: 'mch_get_advertisement' };

  if (!mchPrivatekey) return;

  fetch
    .gateway(params)
    .then((res) => {
      console.log('socket login update banner success');
      const { returnCode = '', machineAdvert = '[]' } = res.data;
      const imagesArr = JSON.parse(machineAdvert || '[]') || [];

      if (returnCode !== 'SUCCESS' || !imagesArr.length) return;

      const list = utils.sort(imagesArr).map(ele => decodeURIComponent(ele.picture));    // 排序 转码

      // 下载图片存储在本地
      utils.downloadFile(list)
        .then(res => {
          console.log(res, 'login downloadFile success');
          utils.faceSendMes({ type: 'reload' });//刷新首页，更新数据
        })
    })
    .catch(err => {
      console.log('socket login update banner err', err);
    })
}

export default { command, installApp }