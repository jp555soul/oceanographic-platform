import CryptoJS from 'crypto-js';
import { getSessionKey } from './sessionKey';

const EncryptedStorage = {
  setItem: (key, value) => {
    const sessionKey = getSessionKey();
    if (sessionKey) {
      const encryptedValue = CryptoJS.AES.encrypt(JSON.stringify(value), sessionKey).toString();
      localStorage.setItem(key, encryptedValue);
    } else {
      console.warn('Session key not set. Data will not be encrypted.');
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  getItem: (key) => {
    const sessionKey = getSessionKey();
    const storedValue = localStorage.getItem(key);

    if (sessionKey && storedValue) {
      try {
        const bytes = CryptoJS.AES.decrypt(storedValue, sessionKey);
        const decryptedValue = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedValue);
      } catch (error) {
        console.error('Error decrypting data from localStorage:', error);
        return null;
      }
    } else {
      try {
        return JSON.parse(storedValue);
      } catch (error) {
        return storedValue;
      }
    }
  },

  removeItem: (key) => {
    localStorage.removeItem(key);
  },
};

export default EncryptedStorage;
