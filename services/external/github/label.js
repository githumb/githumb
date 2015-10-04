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
    },

    removeLabelReviewed: function(owner, repo, number, callback) {
      console.log('removing reviewed label');

      var url = GITHUB_HOST + `/repos/${owner}/${repo}/issues/${number}/labels`;

      request
          .del({
            url: url,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'kodok'
            }
          }, callback)
          .auth(username, password);
    },

    getLabelList: function(repoFullName, number, callback) {
      var url = GITHUB_HOST + `/repos/${repoFullName}/issues/${number}/labels`;

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
