"use strict"

var botService = require('./githumb_bot_service');
var timers = new Map();

function isNewOpenedPullRequest (action) {
  return action === 'opened'
}

module.exports = {
  addToExpiredNotify: function (body) {
    if (isNewOpenedPullRequest(body.action)) {

      var pullRequest = {
        repoFullName: body.pull_request.head.repo.full_name,
        title: body.pull_request.title,
        id: body.pull_request.number,
        author: body.pull_request.user.login,
        url: body.pull_request.url
      };

      var timer = setTimeout(function() {
        console.log("Run");
        botService.notifyPullRequestExpired(pullRequest, function (success) {
          if (success) {
            console.log("Success!")
          } else {
            console.log("Error!")
          }
        });
      }, 10000 );

      timers.set(pullRequest.repoFullName, timer);
    }
  },

  removeFromExpiredNotify: function (body) {
    var timer = timers.get(body.pull_request.head.repo.full_name);
    if (timer == null) {
      return false;
    }

    timer.close();
    timers.delete(repoFullName);
  }
};
