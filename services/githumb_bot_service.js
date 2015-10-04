'use strict';

var SlackService = require('./slack_service');
var Log = require('log');
var Redis = require('ioredis');

var logger = new Log('info');

var redis = new Redis({
  port: 6379,
  host: '127.0.0.1',
  db: 13
});

var slackClient = new SlackService(function(message) {
    logger.info("Received message from slack: " + JSON.stringify(message));
    console.log(message);

    tryHandleBindRepoToChannel(message);
    tryHandleUnbindRepoFromChannel(message);
});

function tryHandleBindRepoToChannel(message) {
    if (message == null || message.text == null) {
        return;
    }
    var regexResult = message.text.match(/listen\s+to\s+(.+)/i);

    if (regexResult != null && regexResult[1] != null) {
        bindRepoToChannel(regexResult[1], message.channel, function() {
            var channel = slackClient.getChannelGroupOrDMByID(message.channel);
            channel.send(":ok_hand:");
        });
    }
}

function tryHandleUnbindRepoFromChannel(message) {
    if (message == null || message.text == null) {
        return;
    }
    var regexResult = message.text.match(/forget\s+(.+)/i);

    if (regexResult != null && regexResult[1] != null) {
        unbindRepoFromChannel(regexResult[1], message.channel, function(found) {
            var channel = slackClient.getChannelGroupOrDMByID(message.channel);

            if (found) {
                channel.send(":see_no_evil: :hear_no_evil: :speak_no_evil:");
            } else {
                channel.send(":fu:");
            }
        });
    }
}

function bindRepoToChannel(repoFullName, channelId, callback) {
    redis.hget("repoChannel", repoFullName, function(err, result) {
        if (err == null) {
            var destinationChannels;

            if (result == null) {
                destinationChannels = [channelId];
            } else {
                var channelSet = new Set(JSON.parse(result)).add(channelId);
                destinationChannels = Array.from(channelSet);
            }

            redis.hset("repoChannel", repoFullName, JSON.stringify(destinationChannels), function(err, result) {
                logger.info("done binding repo [" + repoFullName + "] to channels [" + destinationChannels + "]");
                callback();
            });
        }
    });
}

function unbindRepoFromChannel(repoFullName, channelId, callback) {
    redis.hget("repoChannel", repoFullName, function(err, result) {
        if (err == null && result != null) {
                var channelSet = new Set(JSON.parse(result));
                if (channelSet.has(channelId)) {
                    channelSet.delete(channelId);
                    redis.hset("repoChannel", repoFullName, JSON.stringify(Array.from(channelSet)), function(err, result) {
                        logger.info("done unbinding repo [" + repoFullName + "] from channel [" + channelId + "]");
                        callback(true);
                    });
                } else {
                    callback(false);
                }
        } else {
            callback(false);
        }
    });
}

function buildPullRequestReviewedMessage(pullRequest) {
    return "Pull request has been `reviewed`: " + pullRequest.title + "(" + pullRequest.id + "), author: " + pullRequest.author + ", url: " + pullRequest.url;
}

function buildPullRequestExpiredMessage(pullRequest) {
    return "Pull request has been `expired`, please kindly review: " + pullRequest.title + "(" + pullRequest.id + "), author: " + pullRequest.author + ", url: " + pullRequest.url;
}

module.exports = {
    notifyPullRequestReviewed: function(pullRequest, callback) {
        redis.hget("repoChannel", pullRequest.repoFullName, function(err, result) {
            if (err == null && result != null) {
                var channelSet = new Set(JSON.parse(result));
                var message = buildPullRequestReviewedMessage(pullRequest);
                for (let channelId of channelSet) {
                    var channel = slackClient.getChannelGroupOrDMByID(channelId);
                    channel.send(message);
                }
                callback(true);
            } else {
                callback(false);
            }
        });
    },

    notifyPullRequestExpired: function (pullRequest, callback) {
        redis.get(pullRequest.repoFullName, function(err, result) {
            if (err == null && result != null) {
                var channelSet = new Set(JSON.parse(result));
                var message = buildPullRequestExpiredMessage(pullRequest);
                console.log("Message : " + message);
                for (let channelId of channelSet) {
                    var channel = slackClient.getChannelGroupOrDMByID(channelId);
                    channel.send(message);
                }
                callback(true);
            } else {
                console.log("Error : " + err);
                console.log("Result : " + result);
                callback(false);
            }
        });
    }
};
