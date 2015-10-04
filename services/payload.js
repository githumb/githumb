'use strict';

var okCommentLogic = require('./ok_comment');
var Redis = require('ioredis');

var redis = new Redis({
  port: 6379,
  host: '127.0.0.1',
  db: 8
});

module.exports = function(req, res) {
    console.log(req.body);

    var body = req.body;

    if (isPullRequestCommentOk(body)) {
      okCommentLogic(body, res, redis);
    }

    function isPullRequestCommentOk(body) {
      return body.action === 'created' && body.comment !== null && body.comment.body.trim() === ':ok_hand:';
    }
};

