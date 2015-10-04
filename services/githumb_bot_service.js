'use strict';

var SlackService = require('./slack_service');
var Log = require('log');
var Redis = require('ioredis');
var config = require('../config/config')

var logger = new Log('info');

var redis = new Redis({
  port: 6379,
  host: '127.0.0.1',
  db: 13
});

var slackClient = new SlackService(function(message) {
    logger.info("Received message from slack: " + (message));
    console.log(message);

    tryHandleBindRepoToChannel(message);
    tryHandleUnbindRepoFromChannel(message);
    tryHandleAddUserToRepo(message);
});

function tryHandleBindRepoToChannel(message) {
    if (message == null || message.text == null) {
        return;
    }
    var regexResult = message.text.match(/listen\s+to\s+(.+)/i);

    if (regexResult != null && regexResult[1] != null) {
        bindRepoToChannel(regexResult[1], message.channel, function(success) {
            var channel = slackClient.getChannelGroupOrDMByID(message.channel);
            if (success) {
                channel.send(":ok_hand:");
            } else {
                channel.send(":fu:");
            }
        });
    }
}

function tryHandleUnbindRepoFromChannel(message) {
    if (message == null || message.text == null) {
        return;
    }
    var regexResult = message.text.match(/forget\s+(.+)/i);

    if (regexResult != null && regexResult[1] != null) {
        unbindRepoFromChannel(regexResult[1], message.channel, function(success) {
            var channel = slackClient.getChannelGroupOrDMByID(message.channel);

            if (success) {
                channel.send(":see_no_evil: :hear_no_evil: :speak_no_evil:");
            } else {
                channel.send(":fu:");
            }
        });
    }
}

function tryHandleAddUserToRepo(message) {
    if (message == null || message.text == null || message.user == null) {
        return;
    }
    var regexResult = message.text.match(/add\s+(<@.*>)\s+to\s+(.+)/i);

    if (regexResult != null && regexResult[2] != null) {
        var commandIssuer = slackClient.getUserByID(message.user);
        if (config.githumb.bot.admins.find(function(element, index, array) {
            return element == commandIssuer.name;
        }) == null) {
            var channel = slackClient.getChannelGroupOrDMByID(message.channel);
            channel.send("You're not authorized to do this :fu: :fu: :fu:");
            return;
        }

        var userIds = extractUserIdsFromString(regexResult[1]);
        var repoFullName = regexResult[2];

        bindUserIdsToRepo(userIds, repoFullName, function(success) {
            var channel = slackClient.getChannelGroupOrDMByID(message.channel);

            if (success) {
                channel.send(":ok_hand:");

                userIds.forEach(function(f) {
                    slackClient.openDM(f, function(result) {
                        if (result != null && result.ok) {
                            var channel = slackClient.getChannelGroupOrDMByID(result.channel.id);
                            channel.send("You've been added to repo [" + repoFullName + "] :fu:");
                        }
                    });
                });
            } else {
                channel.send(":fu:");
            }
        });
    }
}

function extractUserIdsFromString(userIdsString) {
    return userIdsString.split(/\s+/).map(function(f) {
        return f.match(/[A-Za-z0-9]+/i)[0];
    });
}

function bindRepoToChannel(repoFullName, channelId, callback) {
    redis.hget("repoChannels", repoFullName, function(err, result) {
        if (err == null) {
            var destinationChannels;

            if (result == null) {
                destinationChannels = [channelId];
            } else {
                var channelSet = new Set(JSON.parse(result)).add(channelId);
                destinationChannels = Array.from(channelSet);
            }

            redis.hset("repoChannels", repoFullName, JSON.stringify(destinationChannels), function(err, result) {
                logger.info("done binding repo [" + repoFullName + "] to channels [" + destinationChannels + "]");
                callback(true);
            });
        } else {
            callback(false);
        }
    });
}

function unbindRepoFromChannel(repoFullName, channelId, callback) {
    redis.hget("repoChannels", repoFullName, function(err, result) {
        if (err == null && result != null) {
                var channelSet = new Set(JSON.parse(result));
                if (channelSet.has(channelId)) {
                    channelSet.delete(channelId);
                    redis.hset("repoChannels", repoFullName, JSON.stringify(Array.from(channelSet)), function(err, result) {
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

function bindUserIdsToRepo(userIds, repoFullName, callback) {
    redis.hget("repoUsers", repoFullName, function(err, result) {
        if (err == null) {
            var userSet;

            if (result == null) {
                userSet = new Set(userIds);
            } else {
                userSet = new Set(JSON.parse(result).concat(userIds));
            }

            redis.hset("repoUsers", repoFullName, JSON.stringify(Array.from(userSet)), function(err, result) {
                logger.info("done adding users [" + userIds + "] to repo [" + repoFullName + "]");
                callback(true);
            });
        } else {
            callback(false);
        }
    });
}

function buildPullRequestReviewedMessage(pullRequest) {
    return "PR has been `reviewed`: " + pullRequest.title + "(#" + pullRequest.id + "), author: " + pullRequest.author + ", url: " + pullRequest.url;
}

function buildPullRequestUnreviewedMessage(pullRequest) {
    return "PR `reviewed` label has been revoked: " + pullRequest.title + "(#" + pullRequest.id + "), author: " + pullRequest.author + ", url: " + pullRequest.url;
}

function buildPullRequestExpiredMessage(pullRequest) {
    return "Pull request has been `expired`, please kindly review: " + pullRequest.title + "(#" + pullRequest.id + "), author: " + pullRequest.author + ", url: " + pullRequest.url;
}

function sendRepoNotification(repoFullName, message, callback) {
    redis.hget("repoChannels", repoFullName, function(err, result) {
        if (err == null && result != null) {
            var channelSet = new Set(JSON.parse(result));
            for (let channelId of channelSet) {
                var channel = slackClient.getChannelGroupOrDMByID(channelId);
                channel.send(message);
            }
            callback(true);
        } else {
            callback(false);
        }
    });
}

module.exports = {
    notifyPullRequestReviewed: function(pullRequest, callback) {
        sendRepoNotification(pullRequest.repoFullName, buildPullRequestReviewedMessage(pullRequest), callback);
    },

    notifyPullRequestUnreviewed: function(pullRequest, callback) {
        sendRepoNotification(pullRequest.repoFullName, buildPullRequestUnreviewedMessage(pullRequest), callback);
    },

    notifyPullRequestExpired: function (pullRequest, callback) {
        sendRepoNotification(pullRequest.repoFullName, getChannelGroupOrDMByID(pullRequest), callback);
    },
};
