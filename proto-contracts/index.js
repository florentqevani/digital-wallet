const path = require('path');

module.exports = {
    protoPath: path.join(__dirname, 'proto'),

    loadProto: ({ filename }) => {
        return require(path.join(__dirname, 'proto', filename));
    }
};