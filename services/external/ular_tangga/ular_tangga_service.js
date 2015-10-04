'use strict';
var request = require('request');
var config = require('../../../config/config').githumb;

module.exports = {

  /*
    - ID upvoter
    - ID yang di-upvote
    - Upvote di bagian apa
    - upvote_data : {
        id_upvoter: 1,
        id_upvoted: 2,
        part: "code_ninja"
      }
   */
  upvote: function(upvote_data, error) {
    var factorId = 0;
    if (upvote_data.part == "code_ninja") {
      factorId = 0;
    } else if (upvote_data.part == "bug_buster") {
      factorId = 1;
    } else {
      return;
    }

    var upvoteUri = config.ulartangga_url + "/" + upvote_data.id_upvoted + "/undi?factor_id=" + factorId;

    request({method: 'get', uri: upvoteUri}, function (err, res, body) {
      if (err) {
        console.error("Failed to post to ular tangga");
        return error(err);
      } else {
        if (res.statusesCode)
        console.info(res.statusCode)
        console.info(body)

        return error(null)
      }
    })
  }
}
