require('dotenv').config();

const config = {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || 'development',
    authServiceUrl: process.env.AUTH_SERVICE_URL,
    logServiceUrl: process.env.LOG_SERVICE_URL,
    apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://api-gateway:8080',
    raiaccept: {
        username: process.env.RAIACCEPT_USERNAME || 'your-sandbox-username',
        password: process.env.RAIACCEPT_PASSWORD || 'your-sandbox-password',
        // Fake-host URLs intercepted by Flutter WebView NavigationDelegate
        mobileCallbackBase: process.env.RAIACCEPT_MOBILE_CALLBACK_BASE || 'http://mobile.callback',
        // Public URL of mobile-bff (used for the server-side webhook notification)
        webhookUrl: process.env.RAIACCEPT_WEBHOOK_URL || 'http://localhost:3002',
    },
};

module.exports = config;
