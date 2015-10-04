'use strict';

var GITHUB_HOST = 'https://api.github.com';

var request = require('request');

module.exports = function(username, password) {
  return {
    getCommit: function(owner, repo, sha, callback) {
      var url = GITHUB_HOST + `/repos/${owner}/${repo}/commits/${sha}`;

      request
          .get({
            url: url,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'kodok'
            }
          }, callback)
          .auth(username, password);
    }
  };
}
