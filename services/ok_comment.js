'use strict';

var githumbBot = require('./githumb_bot_service');
var Github = require('./external/github/label');
var Log = require('log');
var expiredLogic = require('./expired_notify')

var github = Github('githumbot', 'githumb123');
var logger = new Log('info');

module.exports = function(body, res, redis) {
  var pullId = body.repository.id + '-' + body.issue.number;

  console.log('pull id: ' + pullId);

  redis.database9.get(pullId, function(err, result) {
    var hasActiveComment = result !== null && JSON.parse(result).active_reviews.length > 0;

    redis.database8.get(pullId, function(err, result) {
      console.log('entry on redis: ' + result);

      var pull = parse(pullId, result);

      incrementOk(pull);

      redis.database8.set(pullId, JSON.stringify(pull));

      if (pull.current_ok >= 2 && !hasActiveComment) {
        console.log('pull request is completed');

        github.addLabelReviewed(body.repository.owner.login, body.repository.name, body.issue.number, function(err, _res, _body) {
          githumbBot.notifyPullRequestReviewed({
            repoFullName: body.repository.full_name,
            title: body.issue.title,
            id: body.issue.number,
            url: body.issue.html_url,
            author: body.issue.user.login,
          }, function(success) {
            logger.info("added reviewed label");

            expiredLogic.removeFromExpiredNotify(body);
          });
        });
      }

      res.send('OK');

      console.log('\n===end of request===\n \n\n\n\n\n');
    });
  });

  function parse(id, result) {
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
