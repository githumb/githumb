'use strict';

var Github = require('./external/github/label');
var github = Github('githumbot', 'githumb123');

module.exports = function(body, res, redis) {
  var pullId = body.repository.id + '-' + body.issue.number;

  console.log('pull id: ' + pullId);

  redis.get(pullId, function(err, result) {
    console.log('entry on redis: ' + result);

    var pull = parsePull(pullId, result);

    incrementOk(pull);

    redis.set(pullId, JSON.stringify(pull));

    console.log('total ok: ' + pull.total_ok);

    if (pull.total_ok >= 2) {
      console.log('pull request is completed');

      github.addLabelReviewed(body.repository.owner.login, body.repository.name, body.issue.number, function(err, response, body) {
        // TODO notify labeled
        console.log("added review label");
      });
    }

    res.send('OK');

    console.log('\n===end of request===\n \n\n\n\n\n');
  });

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
