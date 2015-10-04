'use strict';

// var payloadLogic = require('./payload');
var payloadLogic = require('../../services/payload');

module.exports = function(router) {

  router.post('/', payloadLogic);

};
