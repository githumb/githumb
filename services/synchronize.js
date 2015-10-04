'use strict';

var Github = require('./external/github/label');
var github = Github('githumbot', 'githumb123');
var Log = require('log');
var githumbBot = require("./githumb_bot_service");
var logger = new Log('info');

module.exports = function(body, res, redis) {
  var pullId = body.repository.id + '-' + body.pull_request.number;

  console.log('pull id: ' + pullId);

  // TODO notify team new commit pushed

  redis.get(pullId, function(err, result) {
    console.log('entry on redis: ' + result);

    if (result != null) {
      var pull = JSON.parse(result);

      pull.current_ok = 0;

      redis.set(pullId, JSON.stringify(pull));

      github.removeLabelReviewed(body.repository.owner.login, body.repository.name, body.pull_request.number, function(err, _res, _body) {
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

    res.send('OK');

    console.log('\n===end of request===\n \n\n\n\n\n');
  });
};
