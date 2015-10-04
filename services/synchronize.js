'use strict';

var GhLabel = require('./external/github/label');
var GhCommit = require('./external/github/commit');
var Log = require('log');
var githumbBot = require("./githumb_bot_service");
var _ = require('underscore');

var ghLabel = GhLabel('githumbot', 'githumb123');
var ghCommit = GhCommit('githumbot', 'githumb123');
var logger = new Log('info');

module.exports = function(body, res, redis) {
  var pullId = body.repository.id + '-' + body.pull_request.number;

  console.log('pull id: ' + pullId);

  redis.database8.get(pullId, tryUpdateCurrentOk);

  function tryUpdateCurrentOk(err, result) {
    console.log('entry on redis: ' + result);

    if (result != null) {
      var pull = JSON.parse(result);

      pull.current_ok = 0; // TODO aware user

      redis.database8.set(pullId, JSON.stringify(pull));

      ghLabel.removeLabelReviewed(body.repository.owner.login, body.repository.name, body.pull_request.number, function(err, _res, _body) {
        githumbBot.notifyPullRequestUnreviewed({
          repoFullName: body.repository.full_name,
          title: body.pull_request.title,
          id: body.pull_request.number,
          url: body.pull_request.html_url,
          author: body.pull_request.user.login,
        }, function(success) {
          logger.info("removed reviewed label")
        });
      });
    }

    redis.database9.get(pullId, tryUpdateActiveComments);
  }

  function tryUpdateActiveComments(err, result) {
    if (result == null) {
      return;
    }

    var reviewComment = JSON.parse(result);

    ghCommit.getCommit(body.repository.owner.login, body.repository.name, body.pull_request.head.sha, function(err, _res, _body) {
      var fileChanges = _.map(JSON.parse(_body).files, function(file) {
        return file.filename;
      });

      var activeReviews = _.filter(reviewComment.active_reviews, function(review) {
        return !_.contains(fileChanges, review.file_name);
      });

      reviewComment.active_reviews = activeReviews;

      redis.database9.set(pullId, JSON.stringify(reviewComment));

      res.send('OK');

      console.log('\n===end of request===\n \n\n\n\n\n');
    });
  }

};
