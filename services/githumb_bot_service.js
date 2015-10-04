'use strict';

var SlackService = require('./slack_service');
var Log = require('log');

var repoChannelMap = new Map();

var logger = new Log('info');

var slackClient = new SlackService(function(message) {
    tryHandleBindRepoToChannel(message);
    tryHandleUnbindRepoFromChannel(message);

    return logger.info("Received message from slack: " + message);
});

function tryHandleBindRepoToChannel(message) {
    var regexResult = message.text.match(/listen\s+to\s+(.+)/i);

    if (regexResult != null && regexResult[1] != null) {
        if (bindRepoToChannel(regexResult[1], message.channel)) {
            var channel = slackClient.getChannelGroupOrDMByID(message.channel);
            channel.send(":ok_hand:");
        }
    }
}

function tryHandleUnbindRepoFromChannel(message) {
    var regexResult = message.text.match(/forget\s+(.+)/i);

    if (regexResult != null && regexResult[1] != null) {
        if (unbindRepoFromChannel(regexResult[1], message.channel)) {
            var channel = slackClient.getChannelGroupOrDMByID(message.channel);
            channel.send(":see_no_evil: :hear_no_evil: :speak_no_evil:");
        }
    }
}

function bindRepoToChannel(repoFullName, channelId) {
    var channelSet = repoChannelMap.get(repoFullName);

    if (channelSet == null) {
        channelSet = new Set();
        repoChannelMap.set(repoFullName, channelSet);
    }

    channelSet.add(channelId);
    logger.info("bind repo [" + repoFullName + "] to channels [" + Array.from(channelSet) + "]");

    return true;
}

function unbindRepoFromChannel(repoFullName, channelId) {
    var channelSet = repoChannelMap.get(repoFullName);
    if (channelSet != null) {
        channelSet.delete(channelId);
    }

    logger.info("unbind repo [" + repoFullName + "] from channel [" + channelId + "]");
    return true;
}

function buildPullRequestReviewedMessage(pullRequest) {
    return "Pull request has been reviewed: " + pullRequest.title + "(" + pullRequest.id + "), author: " + pullRequest.author + ", url: " + pullRequest.url;
}

module.exports = {
    notifyPullRequestReviewed: function(pullRequest) {
        var channelSet = repoChannelMap.get(pullRequest.fullName);
        if (channelSet == null) {
            return false;
        }

        var message = buildPullRequestReviewedMessage(pullRequest);
        for (let channelId of channelSet) {
            var channel = slackClient.getChannelGroupOrDMByID(channelId);
            channel.send(message);
        }
        return true;
    }
};
