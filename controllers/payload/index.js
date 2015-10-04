'use strict';

var Redis = require('ioredis');
var redis = new Redis({
  port: 6379,
  host: '127.0.0.1',
  db: 8
});

module.exports = function(router) {

  router.post('/', function(req, res) {
    console.log(req.body);

    var body = req.body;
    var pullId = body.repository.id + '-' + body.issue.number;

    console.log(pullId);

    if (isPullRequestCommentOk(body)) {
      redis.get(pullId, function(err, result) {
        console.log(result);

        var pull = parsePull(pullId, result);

        redis.set(pullId, JSON.stringify(incrementOk(pull)));

        res.send('OK');
        console.log('\n===end of request===\n');
      });
    }
  });

  function isPullRequestCommentOk(body) {
    return body.action === 'created' && body.comment !== null && body.comment.body.trim() === ':ok_hand:';
  }

  function parsePull(id, result) {
    if (result == null) {
      return {
        id: id,
        current_ok: 0,
        total_ok: 0
      };
    }
    return JSON.parse(result);
  }

  function incrementOk(pull) {
    pull.current_ok += 1;
    pull.total_ok += 1;

    return pull;
  }

};
