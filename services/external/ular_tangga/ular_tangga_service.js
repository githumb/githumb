'use strict';
var request = require('request');
var config = require('../../../config/config').githumb;

module.exports = {

  /*
    - ID upvoter
    - ID yang di-upvote
    - Upvote di bagian apa
    - upvote_data : {
        id_upvoter: "andes",
        id_upvoted: "gde",
        part: "code_ninja"
      }
   */
  upvote: function(upvote_data, error) {
    console.log("Upvote ular tangga data : ", upvote_data);
    request({method: 'post', uri: config.ulartangga_url, body: JSON.stringify(upvote_data)}, function (err, res, body) {
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
