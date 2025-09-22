import CryptoJS from 'crypto-js';
import { getSessionKey } from './sessionKey';

class EncryptedStorage {
  static encrypt(data) {
    const sessionKey = getSessionKey();
    if (!sessionKey) {
      // console.error('No session key available for encryption.');
      return null;
    }
    if (data == null) {
      return null;
    }
    return CryptoJS.AES.encrypt(JSON.stringify(data), sessionKey).toString();
  }

  static decrypt(encryptedData) {
    const sessionKey = getSessionKey();
    if (!sessionKey) {
      // console.error('No session key available for decryption.');
      return null;
    }
    if (encryptedData == null) {
      return null;
    }
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, sessionKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      if (decryptedData) {
        return JSON.parse(decryptedData);
      }
      return null;
    } catch (error) {
      // This can happen if the data is not encrypted or the key is wrong.
      // We will handle this in the getItem method.
      return null;
    }
  }

  static setItem(key, data) {
    const encryptedData = this.encrypt(data);
    localStorage.setItem(key, encryptedData);
  }

  static getItem(key) {
    const encryptedData = localStorage.getItem(key);
    const decryptedData = this.decrypt(encryptedData);

    if (decryptedData) {
        return decryptedData;
    }

    // Migration for unencrypted data
    const unencryptedData = localStorage.getItem(key);
    if(unencryptedData){
        try {
            const parsedData = JSON.parse(unencryptedData);
            this.setItem(key, parsedData);
            return parsedData;
        } catch (error) {
            // It's not a json object, so we just set it as a string
            this.setItem(key, unencryptedData);
            return unencryptedData;
        }
    }

    return null;
  }

  static removeItem(key) {
    localStorage.removeItem(key);
  }
}

export default EncryptedStorage;
