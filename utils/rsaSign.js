import Jsrsasign, { KJUR, b64utohex } from 'jsrsasign';
import utils from './util';
import Crypto from './crypto';

let _qfqPublickey = '';

const rsaSign = {
  install(key = '') {
    _qfqPublickey = key;
  },
  initPrivteKey: '-----BEGIN PRIVATE KEY-----MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBANgHv3u15Fpwan2qUQRRGW+X1kdoNFiKNZsbe+lGZ9nheMlPnnIv9QM7sOOpAF7beDVubDq1QMhrxodMRW8vO7L2THxIN8ozizP2Tq7x0ThKc2+vpiVLP76JavzSn5qXCHvJUDLCuDdEDBo4504e2drYVzAEeowFVBvvBYQ/joAXAgMBAAECgYEAhsUGozHNPNKGzNDU7CGAAcsypaePiHDoklQqEFSY8ycjSEuAaHIcoyC48L38+jBmpMa3hESRHreFyeA+LOfFkHDaCZ1kt+VrzaUvGoMOvINcGOPauv39aG3ixZKbxYTJrHBZV1XIOjE7lD5sVf+hqWWoBL3N+cdXBmsHJMsYcPECQQD7mRegy3NXU//Eiad+THfHnL7fjtHg4oU8c6yGHbQrKF42Fy8ceKTgMS+RtaGTI8twbyl5B55kR5/Ti87Uj/hpAkEA289ZAuBGV3MM8P13MT1JTGdl2DollVPsRTAlZ8rwdHvXz0i4USOTtVZG6nBEaVmydwgM64U23hMBJo4A0SekfwJBAOUBX+RXytB+AJvfv7jR2WSzY3kRAi/zftqbXzlj6A4wXDBXweXkWg5GNsolzL+lIRNh2xnyuVUFbJCc/NG1iaECQEzHhKQIiwmI2oBjSPseGThi9aQty2r5wZH5W1eB/7PwflWdZSSSdMnmtSa2yG60Mi551Wl/QscXhFNfTtHAMykCQBEI3hJMUcpYN+REsFVwBWP8eXcSOuHtYe19yjnttccIdRzC73klpfSXvGzhpagiGSuUfKwDKfDGkgQ6rkBfy8M=-----END PRIVATE KEY-----',
  initpublicKey: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4G+OSs43I0Ctw7nxxuJPauTFsPyjMKkfsvYEcw4wqbn82KQWbFiSTy7P5hul4wdoZaFW5lSnHug+lyjn64t0dtCsaViOWefWrpL1gWZNpOc9gk6qNhQ0120ikHLE1SLH//gVStf+TDeVtaW+4Uzs5J7+/shdvfgU5T4+gxBk9jQIDAQAB",
  paramsWithASCII(str) {//参数名按照ASCII码升序排列
    const self = this;
    var strArr = Object.keys(str);
    var s1 = Array.prototype.sort.call(strArr, function (a, b) {
      for (var i = 0; i < a.length; i++) {
        if (a.charCodeAt(i) == b.charCodeAt(i)) continue;
        return a.charCodeAt(i) - b.charCodeAt(i);
      }
    });
    var signStr = "";
    s1.map(function (item, index) {
      let param = item + "=" + str[item];
      if (index == 0) {
        signStr = param
      } else {
        signStr = signStr + "&" + param;
      }
    })
    return signStr;
  },
  signatureLogin: function (val) {//SHA1WithRSA  登录加签
    let privateKey = this.initPrivteKey;
    var rsa = new Jsrsasign.RSAKey();
    rsa = Jsrsasign.KEYUTIL.getKey(privateKey);
    let signature = new KJUR.crypto.Signature({ "alg": "SHA1withRSA" });
    signature.init(rsa);
    signature.updateString(val);
    let sign = signature.sign().toUpperCase();
    return sign;
  },
  signature: function (val, privateKey1 = this.initPrivteKey) {//SHA1WithRSA  其他接口动态加签
    var rsa = new Jsrsasign.RSAKey();
    rsa = Jsrsasign.KEYUTIL.getKey(privateKey1);
    let signature = new KJUR.crypto.Signature({ "alg": "SHA1withRSA" });
    signature.init(rsa);
    signature.updateString(val);
    let sign = signature.sign().toUpperCase();
    return sign;
  },
  //验签
  vfSignature: function (obj, sign, pk = '') {
    let val = this.paramsWithASCII(obj);
    let qfqPublickey = '';

    if (_qfqPublickey) {
      qfqPublickey = _qfqPublickey;
    } else {
      if (utils.fsm.get().qfqPublickey) {
        const _key = utils.fsm.get().qfqPublickey;
        rsaSign.install(_key);
        qfqPublickey = _key;
      }
    }

    pk = pk || qfqPublickey || this.initpublicKey;

    if (pk) {
      pk = '-----BEGIN PUBLIC KEY-----' + pk + '-----END PUBLIC KEY-----'
      let signatureVf = new KJUR.crypto.Signature({ alg: "SHA1withRSA", prvkeypem: pk });
      signatureVf.updateString(val);
      let b = signatureVf.verify(sign);
      return b;
    } else {
      wx.showToast({
        title: '获取公钥失败，请重启或联系客服解决！'
      });
    }
  },
  /**
  * socket rsa 解密
  * priKey  私钥
  * value   解密数据
  */
  socketRsaDncrypt(priKey, value) {
    const priK = '-----BEGIN PRIVATE KEY-----' + priKey + '-----END PRIVATE KEY-----';
    var prv = Jsrsasign.KEYUTIL.getKey(priK);
    var dec4Java = KJUR.crypto.Cipher.decrypt(b64utohex(value), prv);
    return dec4Java;
  },
  /**
   * socket aes 加密
   * value  加密数据
   * nkey   解密密码
   */
  socketAesEncrypt(value, nkey) {
    var key = Crypto.enc.Utf8.parse(nkey);
    var srcs = Crypto.enc.Utf8.parse(value);
    var encrypted = Crypto.AES.encrypt(srcs, key, { mode: Crypto.mode.ECB, padding: Crypto.pad.Pkcs7 });
    var reg = new RegExp('/', "g");

    const res = encrypted.ciphertext.toString().replace(reg, "#");
    // console.info('socketAesEncrypt test', nkey, res);
    return res;
  },
  /**
  * socket aes 解密
  * value  解密数据
  * nkey   解密密码
  */
  socketAesDncrypt(value, nkey) {
    let encryptedHexStr = Crypto.enc.Hex.parse(value);
    let encryptedBase64Str = Crypto.enc.Base64.stringify(encryptedHexStr);
    var key = Crypto.enc.Utf8.parse(nkey);
    var decrypt = Crypto.AES.decrypt(encryptedBase64Str, key, { mode: Crypto.mode.ECB, padding: Crypto.pad.Pkcs7 });
    return Crypto.enc.Utf8.stringify(decrypt).toString();
  }
}

// 测试 aes 解密
// const teword = rsaSign.socketAesEncrypt('123', '891fd8cc71d34713a0cad16ae9b05fb1');
// const tdword = rsaSign.socketAesDncrypt(teword, '891fd8cc71d34713a0cad16ae9b05fb1');
// console.log('tdword', tdword);

export default rsaSign