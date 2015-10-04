'use strict';

var GITHUB_HOST = 'https://api.github.com';

var request = require('request');

module.exports = function(username, password) {
  return {
    addLabelReviewed: function(owner, repo, number, callback) {
      console.log('adding reviewed label');

      var url = GITHUB_HOST + `/repos/${owner}/${repo}/issues/${number}/labels`;

      request
          .post({
            url: url,
            body: '["reviewed"]',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'kodok'
            }
          }, callback)
          .auth(username, password);
    }
  };
}
