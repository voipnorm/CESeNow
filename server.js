'use strict';
require('dotenv').config();
const TPXapi = require('./endpoint');

var endpoint = {
    username: process.env.TPADMIN,
    password: process.env.TPADMINPWD,
    ipAddress: process.env.IPADDRESS,
};

var tp = new TPXapi(endpoint);

tp.on('status', (report) => {

    //do stuff

});
