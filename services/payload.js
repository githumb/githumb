'use strict';

var okCommentLogic = require('./ok_comment');
var synchronizeLogic = require('./synchronize');
var expiredLogic = require('./expired_notify')
var reviewCommentLogic = require('./review_comment');
var Redis = require('ioredis');
var Log = require('log');
var logger = new Log('info');
var ularTangga = require('./external/ular_tangga/ular_tangga_service');

var redis = {
  database8: new Redis({
    port: 6379,
    host: '127.0.0.1',
    db: 8
  }),
  database9: new Redis({
    port: 6379,
    host: '127.0.0.1',
    db: 9
  })
};

var ularTanggaUserIdMap = new Map();
ularTanggaUserIdMap.set("drabiter", 1);
ularTanggaUserIdMap.set("gde-vt", 2);
ularTanggaUserIdMap.set("andesyudanto", 3);

module.exports = function(req, res) {
    console.log(req.body);

    var body = req.body;

    if (isPullRequestCommentOk(req)) {
      var commentBody = req.body.comment.body.trim();

      if (commentBody.match(/^:ok_hand:\s*#design$/i)) {
        ularTangga.upvote({
          id_upvoter: ularTanggaUserIdMap.get(req.body.comment.user.login),
          id_upvoted: ularTanggaUserIdMap.get(req.body.issue.user.login),
          part: "code_ninja"
        }, function(err) {
          logger.error("error: " + err);
        });
      } else if (commentBody.match(/^:ok_hand:\s*#bugfix$/i)) {
        ularTangga.upvote({
          id_upvoter: ularTanggaUserIdMap.get(req.body.comment.user.login),
          id_upvoted: ularTanggaUserIdMap.get(req.body.issue.user.login),
          part: "bug_buster"
        }, function(err) {
          logger.error("error: " + err);
        });
      }

      okCommentLogic(body, res, redis);
    } else if (isSynchronize(req)) {
      synchronizeLogic(body, res, redis);
    } else if (isNewOpenedPullRequest(body)) {
      expiredLogic.addToExpiredNotify(body)
    } else if (isPullRequestReviewComment(req)) {
      reviewCommentLogic(body, res, redis.database9);
    }

    function isPullRequestCommentOk(req) {
      return req.headers['x-github-event'] === 'issue_comment' && req.body.comment.body.trim().match(/(?:^:ok_hand:$|^:ok_hand:\s*#(?:design|bugfix)$)/i) != null;
    }

    function isSynchronize(req) {
      return req.headers['x-github-event'] === 'pull_request' && req.body.action === 'synchronize' && isOpen(req.body);
    }

    function isPullRequestReviewComment(req) {
      return req.headers['x-github-event'] === 'pull_request_review_comment' && isOpen(req.body);
    }

    function isOpen(body) {
      return body.pull_request.state === 'open';
    }

    function isNewOpenedPullRequest(body) {
      return body.action === 'opened'
    }

};
