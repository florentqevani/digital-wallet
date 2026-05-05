
require('dotenv').config();

module.exports = {
    port: process.env.PORT || 50055,
    nodeEnv: process.env.NODE_ENV || 'development',
    raiaccept: {
        username: process.env.RAIACCEPT_USERNAME,
        password: process.env.RAIACCEPT_PASSWORD,
        mobileCallbackBase: process.env.RAIACCEPT_MOBILE_CALLBACK_BASE || 'http://mobile.callback',
        webhookUrl: process.env.RAIACCEPT_WEBHOOK_URL || 'http://localhost:3002',
    },
};