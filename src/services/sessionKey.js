let sessionKey = null;

export const setSessionKey = (key) => {
  sessionKey = key;
};

export const getSessionKey = () => {
  return sessionKey;
};
