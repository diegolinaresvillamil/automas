const PROXY_CONFIG = {
  "/rtm-api": {
    "target": "https://servicio-agendamiento.automas.co/api/",
    "secure": true,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/rtm-api": ""
    }
  }
};

module.exports = PROXY_CONFIG;