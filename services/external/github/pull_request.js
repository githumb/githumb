'use strict';

var GITHUB_HOST = 'https://api.github.com';

var request = require('request');

module.exports = function(username, password) {
  return {
    getOpenPullRequestList: function(repoFullName, callback) {
      var url = GITHUB_HOST + `/repos/${repoFullName}/pulls?state=open`;

      request
          .get({
            url: url,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'kodok'
            }
          }, callback)
          .auth(username, password);
    },

    getPullRequestReviewCommentList: function(repoFullName, number, callback) {
      var url = GITHUB_HOST + `/repos/${repoFullName}/pulls/${number}/comments`;

      request
          .get({
            url: url,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'kodok'
            }
          }, callback)
          .auth(username, password);
    },

    getPullRequestIssueCommentList: function(repoFullName, number, callback) {
      var url = GITHUB_HOST + `/repos/${repoFullName}/issues/${number}/comments`;

      request
          .get({
            url: url,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'kodok'
            }
          }, callback)
          .auth(username, password);
    },
  };
}
