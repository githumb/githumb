'use strict';

module.exports = function(router) {

  router.post('/', function(req, res) {
    console.log(req.body);
    console.log('\n===end of request===\n');
  });

};
