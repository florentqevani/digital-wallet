const Router = require('express').Router();
const config = require('../config');

Router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'web-bff',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString()
    });
});

module.exports = Router;