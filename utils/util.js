import { appId } from '../config'
import rsaSign from './rsaSign';
import commandTiny from './command';

let cacheInfo = {};

const install = info => {
  cacheInfo = info;
}

// 序列化时间
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  // return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':')
  return [year, month, day].map(formatNumber).join('-');
}

// 统一格式
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

// 倒计时
let timer = null;

const clearCountdown = () => {
  clearInterval(timer);
}

const countdown = (self, callback) => {
  clearCountdown();
  timer = setInterval(() => {
    self.data.countTime--;
    self.setData({ countTime: self.data.countTime });
    if (self.data.countTime) return;
    clearCountdown();
    callback && callback();
  }, 1000);
}

//获取随机数
const getRandom = (min, max) => {
  let returnStr = "";
  let range = (max ? Math.round(Math.random() * (max - min)) + min : min);
  const arr = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (var i = 0; i < range; i++) {
    var index = Math.round(Math.random() * (arr.length - 1));
    returnStr += arr[index];
  }
  return returnStr;
};

//校验必填字段
const validate = info => {
  let count = 0;
  for (var i in info) {
    if (!info[i]) {
      wx.showToast({
        icon: 'none',
        title: '请将信息填写完整！',
        duration: 3000,
        success: () => { }
      });
      count++;
    } else {
      if (i == 'userName' && info[i] && (!/^1[3456789]\d{9}$/.test(info[i]))) {
        wx.showToast({
          icon: 'none',
          title: '手机号码格式有误！！',
          duration: 3000,
          success: () => { }
        });
        count++;
      }
    }
  }
  return count;
}

// 缓存文件
const fs = wx.getFileSystemManager();
const path = wx.env.USER_DATA_PATH + '/info.txt';
const fsm = {
  set(info, callback, failFn) {
    let str = '';
    str = typeof info === 'object' ? JSON.stringify(info) : info;
    fs.writeFile({
      filePath: path,
      data: str,
      encoding: 'utf8',
      success() {
        callback && callback();
      },
      fail(err) {
        if (failFn) {
          failFn(err);
        }
        console.log('err');
      }
    });
  },
  get() {
    let data = null;
    try {
      data = fs.readFileSync(path, 'utf8');
    } catch (e) {
      fsm.set({});
      return {};
    }
    return JSON.parse(data);
  },
  remove() {
    fs.readdir({  // 获取文件列表
      dirPath: wx.env.USER_DATA_PATH,// 当时写入的文件夹
      success(res) {
        res.files.length && res.files.forEach((el) => {
          if (el === 'miniprogramLog') return;//不删除日志文件
          // 删除存储的垃圾数据
          fs.unlink({
            filePath: `${wx.env.USER_DATA_PATH}/${el}`,
            success(res) {
              console.log(res, 'unlink');
            },
            fail(e) {
              console.log('readdir文件删除失败：', e)
            }
          });
        })
      },
      fail(err) {
        console.log(err, 'readdir err');
      }
    })
  }
}

// 下载图片存储到本地
// arr 要下载的图片地址数组
function downloadFile(arr) {
  let resArr = [];
  return new Promise((resolve, reject) => {
    arr.forEach((ele, index) => {
      wx.downloadFile({
        url: ele,
        success(res) {
          wx.saveFile({
            tempFilePath: res.tempFilePath,
            success(res) {
              resArr.push(res.savedFilePath);
              if (index === arr.length - 1) {
                resolve(resArr);
                console.log(res, 'saveFile suc');
              }
            },
            fail(err) {
              console.log(err, 'saveFile err');
              reject(err);
            }
          })
        },
        fail(err) {
          console.log(err, 'download err');
        }
      })
    })
  })
}

// 删除所有存储的文件
function removeSavedFile(callback) {
  wx.getSavedFileList({
    success(savedFileInfo) {
      let list = savedFileInfo.fileList;
      const len = list.length;
      len && list.forEach((ele, index) => {
        wx.removeSavedFile({
          filePath: ele.filePath,
          success() {
            console.log('removeSavedFile success');
            if (index === len - 1) {
              callback && callback();
            }
          },
          fail(err) {
            console.log('removeSavedFile err', err);
          }
        })
      })
    }
  })
}

// 获取存储文件列表
function getSavedFileList() {
  return new Promise((resolve, reject) => {
    wx.getSavedFileList({
      success(savedFileInfo) {
        const dealArr = savedFileInfo.fileList.map(ele => ele.filePath) || [];
        resolve(dealArr);
      },
      fail(err) {
        console.log('getSavedFileList', err);
        reject(err);
      }
    })
  })
}

// 广告排序
const sort = arr => {
  for (var j = 0; j < arr.length - 1; j++) {
    for (var i = 0; i < arr.length - 1 - j; i++) {
      if (arr[i].sequence > arr[i + 1].sequence) {
        var temp = arr[i];
        arr[i] = arr[i + 1];
        arr[i + 1] = temp;
      }
    }
  }
  return arr;
}

// 发送消息
const faceSendMes = (data, successFn, failFn) => {
  const content = typeof data === 'object' ? JSON.stringify(data) : data;
  wxfaceapp.postMsg({
    targetAppid: appId,
    content,
    success(res) {
      if (successFn) {
        successFn(res);
        return
      }
      console.log('发送成功');
    },
    fail(err) {
      if (failFn) {
        failFn(err);
        return;
      }
      console.log('发送失败', err);
    }
  })
}

// 接受消息
const faceListenMes = callback => {
  wxfaceapp.onRemoteMessage(res => {
    //接受到的消息
    const info = JSON.parse(res.content);
    callback(info);
  })
}

// 节流
function throttle(fn, wait = 1000) {
  let cacheTime = 0;//触发的时间
  return function () {
    let currentTime = + new Date();
    if (currentTime - cacheTime > wait || !cacheTime) {
      fn.apply(this, arguments);
      cacheTime = currentTime;
    }
  };
}


//连续点击多次后执行
let hideGoLoginCount = 0;
let hideGoLoginTimer = null;

function manyClickExecute(callback, count = 3000, num = 8) {
  hideGoLoginCount++;
  clearTimeout(hideGoLoginTimer);
  hideGoLoginTimer = setTimeout(() => {
    hideGoLoginCount = 0;
    clearTimeout(hideGoLoginTimer);
  }, count);
  if (hideGoLoginCount >= num) {
    callback();
    clearTimeout(hideGoLoginTimer);
  }
}

// socket 相关
const socket = {
  is_socket_open: false,
  // socket_url: 'ws://192.168.1.192:8083',//李斌
  socket_url: 'ws://192.168.1.131:8083',//测试
  // socket_url: 'wss://push.qifenmall.com',//线上
  cashSn: '',//收银机sn
  resPriKey: '',//socket 返回的私钥
  aesPriKey: '',//socket 返回的密码
  waitingnews: [],//缓存消息
  count: 0,
  socketHeartBeatTimer: null,
  ManualOpenSocketModel: false,
  // 连接 socket
  startConnectSocket() {
    this.closeSocket();

    const self = this;
    // 打开
    wx.onSocketOpen(res => {
      self.is_socket_open = true;
      console.log('onSocketOpen', res)
      self.reloadConnectSocket();
    })

    wx.connectSocket({
      url: self.socket_url,
      success(res) {
        console.log('connectSocket success', res)
        self.is_socket_open = true;
        self.count = 0;
      },
      fail(err) {
        console.log('connectSocket fail', err);
        // 重连
        if (self.count >= 7) {
          self.count = 0;
          wx.showToast({ title: '网络异常！' });
          return;
        }
        self.count++;
        self.startConnectSocket();
      }
    });
  },
  // socket 事件
  handSocketEvents() {
    const self = this;
    // 关闭
    wx.onSocketClose(res => {
      console.log('onSocketClose', res)
      self.is_socket_open = false;
    })
    // 错误
    wx.onSocketError(err => {
      console.log('onSocketError', err)
      self.is_socket_open = false;
      self.ManualOpenSocketModel = false;
    })
    // 响应消息
    wx.onSocketMessage(res => {
      self.dealSocketMessage(res);
      // console.log('onSocketMessage', res)
    })
  },
  // 发送socket消息
  sendSocketMessage(data, callback) {
    const dealData = Object.assign({}, data);

    dealData.sendSn = cacheInfo.terminalNo || '';//本机sn

    // 当发送的是command指令消息时，进行aes加密
    if (dealData.code === 'command') {
      dealData.receiveSn = this.cashSn || '';//收银机sn
      console.log('sendSocketMessage dealData', dealData);
      dealData.value = rsaSign.socketAesEncrypt(JSON.stringify(data.value), this.aesPriKey);
    }

    const socket_data = JSON.stringify(dealData);

    if (this.is_socket_open) {
      wx.sendSocketMessage({
        data: socket_data,
        success() {
          callback && callback();
        }
      })
    } else {
      // 连接断开或未连接
      console.log('is_socket_open false');
      this.waitingnews.push(data);
      this.startConnectSocket();
    }
  },
  // 处理socket消息
  dealSocketMessage(data) {
    const self = this;
    const socket_data = JSON.parse(data.data) || {};

    console.log('socket res message:', socket_data);

    if (socket_data.code.toString() !== '200') return;

    if (socket_data.data.code === 'connect') {//连接
      this.resPriKey = socket_data.data.value;// 私钥
    } else if (socket_data.data.code === 'register') {//注册
      const res = rsaSign.socketRsaDncrypt(self.resPriKey, socket_data.data.value);
      this.aesPriKey = res;
      console.info('register resKey', res);

      if (self.ManualOpenSocketModel) {
        wx.showToast({
          title: '连接成功',
          complete() {
            self.ManualOpenSocketModel = false;
          }
        })
      }

      self.waitingnews.length && self.waitingnews.forEach((ele, index) => {
        if (index !== 0 && JSON.stringify(ele) === JSON.stringify(self.waitingnews[index - 1])) return;//后面消息和前面消息一样时

        self.sendSocketMessage(ele, function () {
          if (index < self.waitingnews.length - 1) return;
          self.waitingnews = [];
        });
      });
      clearInterval(self.socketHeartBeatTimer);
      self.socketHeartBeat();//心跳
    } else if (socket_data.data.code === 'command') {
      // 指令信息
      const data = rsaSign.socketAesDncrypt(socket_data.data.value, self.aesPriKey);//解密消息

      if (socket_data.data.sendSn) {
        this.cashSn = socket_data.data.sendSn;
      }

      commandTiny.command(JSON.parse(data));
    } else if (socket_data.data.code === 'heart') {
      // 指令信息
      // const data = rsaSign.socketAesDncrypt(socket_data.data.value, self.aesPriKey);//解密消息
      console.log('heart message');
    } else {
      // MSG 时返回的消息
      // const data = rsaSign.socketAesDncrypt(socket_data.data.value, self.aesPriKey);//解密消息
      // const dealData = JSON.parse(data);
      // console.log('MSG', dealData);
    }
  },
  // 关闭 socket
  closeSocket(data = '') {
    this.is_socket_open = false;

    wx.closeSocket({
      reason: data,//关闭socket原因
      success(res) {
        console.log(res);
      },
      fail(err) {
        console.log('close err', err);
      }
    });
  },
  // 重连
  reloadConnectSocket() {
    // console.log('reloadConnectSocket');
    const self = this;
    const sendSn = cacheInfo.terminalNo || '';//设备号
    const connectData = { code: "connect", client: 'web', sendSn, value: "" };
    const registerData = { code: "register", sendSn, client: 'web' };

    wx.sendSocketMessage({
      data: JSON.stringify(connectData),//connect
      success() {
        wx.sendSocketMessage({
          data: JSON.stringify(registerData),//register
          success() {
            self.handSocketEvents();
          }
        });
      }
    });
  },
  // 心跳
  socketHeartBeat() {
    const self = this;
    const data = { code: 'heart', sendSn: cacheInfo.terminalNo };
    // data.value = rsaSign.socketAesEncrypt(JSON.stringify(data.value), self.aesPriKey);
    clearInterval(this.socketHeartBeatTimer);
    this.socketHeartBeatTimer = setInterval(() => {
      wx.sendSocketMessage({
        data: JSON.stringify(data)
      })
    }, 30000);
  }
}

// 获取当前页面page（this）
function getCurrentThis() {
  const pages = getCurrentPages();
  const currentPage = pages.pop();
  return currentPage;
}

let onCancel = null;

export default {
  formatTime, getRandom, countdown, clearCountdown, validate, fsm, sort, faceSendMes, faceListenMes, throttle,
  downloadFile, removeSavedFile, getSavedFileList, manyClickExecute, socket, install, getCurrentThis, onCancel
}
