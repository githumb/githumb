"use strict"

var TIMEOUT = 30000;
var botService = require('./githumb_bot_service');
var timers = new Map();

module.exports = {
  addToExpiredNotify: function(body) {
    var pullRequest = {
      repoFullName: body.pull_request.head.repo.full_name,
      title: body.pull_request.title,
      id: body.pull_request.number,
      author: body.pull_request.user.login,
      url: body.pull_request.url
    };

    var timer = setTimeout(function() {
      console.log("Pull request timed out!");
      botService.notifyPullRequestExpired(pullRequest, function(success) {
        if (success) {
          console.log("Success!")
        } else {
          console.log("Error!")
        }
      });
    }, TIMEOUT);

    timers.set(pullRequest.repoFullName, timer);
  },

  removeFromExpiredNotify: function(body) {
    var repoFullName = body.repository.full_name;
    var timer = timers.get(repoFullName);
    if (timer == null) {
      return false;
    }

    timer.close();
    timers.delete(repoFullName);
    console.log("Pull request expired removed");
  },
};
