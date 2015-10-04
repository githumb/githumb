'use strict';

var okCommentLogic = require('./ok_comment');
var synchronizeLogic = require('./synchronize');
var reviewCommentLogic = require('./review_comment');
var Redis = require('ioredis');

var database8 = new Redis({
  port: 6379,
  host: '127.0.0.1',
  db: 8
});
var database9 = new Redis({
  port: 6379,
  host: '127.0.0.1',
  db: 9
});

module.exports = function(req, res) {
    console.log(req.body);

    var body = req.body;

    if (isPullRequestCommentOk(req)) {
      okCommentLogic(body, res, database8);
    } else if (isSynchronize(req)) {
      synchronizeLogic(body, res, database8);
    } else if (isPullRequestReviewComment(req)) {
      reviewCommentLogic(body, res, database9);
    }

    function isPullRequestCommentOk(req) {
      return req.headers['x-github-event'] === 'issue_comment' && req.body.comment.body.trim() === ':ok_hand:';
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
};

