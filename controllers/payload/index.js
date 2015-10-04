'use strict';

var payloadLogic = require('../../services/payload');

module.exports = function(router) {

  router.post('/', payloadLogic);

};
