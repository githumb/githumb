'use strict';

var SlackService = require('./slack_service');
var Log = require('log');
var Redis = require('ioredis');
var GitHubPullRequest = require('./external/github/pull_request');
var GitHubLabel = require('./external/github/label');
var schedule = require('node-schedule');
var config = require('../config/config');

var logger = new Log('info');
var gitHubPullRequest = new GitHubPullRequest(config.githumb.github.username, config.githumb.github.password);
var gitHubLabel = new GitHubLabel(config.githumb.github.username, config.githumb.github.password);

var redis = new Redis({
  port: 6379,
  host: '127.0.0.1',
  db: 13
});

schedule.scheduleJob('0 0 * * * *', function() {
    logger.info("executing job pullRequestReminderJobStep1");
    pullRequestReminderJobStep1();
});

var slackClient = new SlackService(function(message) {
    logger.info("Received message from slack: " + (message));

    tryHandleNotifyReviewPullRequest(message);
    tryHandleBindRepoToChannel(message);
    tryHandleUnbindRepoFromChannel(message);
    tryHandleAddUserToRepo(message);
    tryHandleAddMeToRepo(message);
    tryHandleMapUserToGithubLogin(message);
    tryHandleMapMeToGithubLogin(message);
});

function tryHandleNotifyReviewPullRequest(message) {
    if (message == null || message.text == null || message.user == null) {
        return;
    }

    if (message.text.match(/remind\s+to\s+review\s+pull\s*request.*/i) != null) {
        var commandIssuer = slackClient.getUserByID(message.user);
        if (config.githumb.bot.admins.find(function(element, index, array) {
            return element == commandIssuer.name;
        }) == null) {
            sendMessageToChannel(message.channel, "You're not authorized to do this :fu: :fu: :fu:");
            return;
        }

        sendMessageToChannel(message.channel, ":ok_hand:");
        pullRequestReminderJobStep1();
    }
}

function tryHandleBindRepoToChannel(message) {
    if (message == null || message.text == null) {
        return;
    }
    var regexResult = message.text.match(/listen\s+to\s+(.+)/i);

    if (regexResult != null && regexResult[1] != null) {
        bindRepoToChannel(regexResult[1], message.channel, function(success) {
            if (success) {
                sendMessageToChannel(message.channel, ":ok_hand:");
            } else {
                sendMessageToChannel(message.channel, ":fu:");
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
            if (success) {
                sendMessageToChannel(message.channel, ":see_no_evil: :hear_no_evil: :speak_no_evil:");
            } else {
                sendMessageToChannel(message.channel, ":fu:");
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
            sendMessageToChannel(message.channel, "You're not authorized to do this :fu: :fu: :fu:");
            return;
        }

        var userIds = extractUserIdsFromString(regexResult[1]);
        var repoFullName = regexResult[2];

        bindUserIdsToRepo(userIds, repoFullName, function(success) {
            if (success) {
                sendMessageToChannel(message.channel, ":ok_hand:");
                userIds.forEach(function(f) {
                    sendDmToUserId(f, "You've been added to repo [" + repoFullName + "] :fu: by <@" + commandIssuer.id + ">");
                });
            } else {
                sendMessageToChannel(message.channel, ":fu:");
            }
        }, function(userId) {
            sendMessageToChannel(message.channel, "User <@" + userId + "> is not mapped to Github Login yet :fu: :fu: :fu:");
        });
    }
}

function tryHandleAddMeToRepo(message) {
    if (message == null || message.text == null || message.user == null) {
        return;
    }
    var regexResult = message.text.match(/add\s+me\s+to\s+(.+)/i);

    if (regexResult != null && regexResult[1] != null) {
        var commandIssuer = slackClient.getUserByID(message.user);
        if (config.githumb.bot.admins.find(function(element, index, array) {
            return element == commandIssuer.name;
        }) == null) {
            sendMessageToChannel(message.channel, "You're not authorized to do this :fu: :fu: :fu:");
            return;
        }

        var userIds = [message.user];
        var repoFullName = regexResult[1];

        bindUserIdsToRepo(userIds, repoFullName, function(success) {
            if (success) {
                sendMessageToChannel(message.channel, ":ok_hand:");
                userIds.forEach(function(f) {
                    sendDmToUserId(f, "You've been added to repo [" + repoFullName + "] :fu: by <@" + commandIssuer.id + ">");
                });
            } else {
                sendMessageToChannel(message.channel, ":fu:");
            }
        }, function(userId) {
            sendMessageToChannel(message.channel, "User <@" + userId + "> is not mapped to Github Login yet :fu: :fu: :fu:");
        });
    }
}

function tryHandleMapUserToGithubLogin(message) {
    if (message == null || message.text == null || message.user == null) {
        return;
    }

    var regexResult = message.text.match(/set\s+(<@[A-Za-z0-9]+>)\s+github\s+login\s+as\s+(.+)/i);
    if (regexResult != null && regexResult[2] != null) {
        var commandIssuer = slackClient.getUserByID(message.user);
        if (config.githumb.bot.admins.find(function(element, index, array) {
            return element == commandIssuer.name;
        }) == null) {
            sendMessageToChannel(message.channel, "You're not authorized to do this :fu: :fu: :fu:");
            return;
        }

        var userIds = extractUserIdsFromString(regexResult[1]);
        var githubLogin = regexResult[2];

        userIds.forEach(function(userId) {
            bindUserIdToGithubLogin(userId, githubLogin, function(success) {
                if (success) {
                    sendMessageToChannel(message.channel, ":ok_hand:");
                } else {
                    sendMessageToChannel(message.channel, ":fu:");
                }
            });
        })
    }
}

function tryHandleMapMeToGithubLogin(message) {
    if (message == null || message.text == null || message.user == null) {
        return;
    }

    var regexResult = message.text.match(/set\s+my\s+github\s+login\s+as\s+(.+)/i);
    if (regexResult != null && regexResult[1] != null) {
        var commandIssuer = slackClient.getUserByID(message.user);
        if (config.githumb.bot.admins.find(function(element, index, array) {
            return element == commandIssuer.name;
        }) == null) {
            sendMessageToChannel(message.channel, "You're not authorized to do this :fu: :fu: :fu:");
            return;
        }

        var userIds = [message.user];
        var githubLogin = regexResult[1];

        userIds.forEach(function(userId) {
            bindUserIdToGithubLogin(userId, githubLogin, function(success) {
                if (success) {
                    sendMessageToChannel(message.channel, ":ok_hand:");
                } else {
                    sendMessageToChannel(message.channel, ":fu:");
                }
            });
        })
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

function bindUserIdsToRepo(userIds, repoFullName, callback, callbackUserNotMappedToGithubLogin) {
    redis.hget("repoUsers", repoFullName, function(err, result) {
        if (err == null) {
            var userSet;

            if (result == null) {
                userSet = new Set(userIds);
            } else {
                userSet = new Set(JSON.parse(result).concat(userIds));
            }

            redis.hset("repoUsers", repoFullName, JSON.stringify(Array.from(userSet)), function(err, result) {
                logger.info("done adding userIds [" + userIds + "] to repo [" + repoFullName + "]");

                userIds.forEach(function(userId) {
                    redis.hget("userGithubLogins", userId, function(err, result) {
                        if (err == null && result == null) {
                            callbackUserNotMappedToGithubLogin(userId);
                        }
                    });
                });

                callback(true);
            });
        } else {
            callback(false);
        }
    });
}

function bindUserIdToGithubLogin(userId, githubLogin, callback) {
    redis.hget("userGithubLogins", userId, function(err, result) {
        if (err == null) {
            redis.hset("userGithubLogins", userId, githubLogin, function(err, result) {
                logger.info("done binding userId [" + userId + "] to githubLogin [" + githubLogin + "]");
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
                sendMessageToChannel(channelId, message);
            }
            callback(true);
        } else {
            callback(false);
        }
    });
}

function sendMessageToChannel(channelId, message) {
    var channel = slackClient.getChannelGroupOrDMByID(channelId);
    if (channel != null) {
        channel.send(message);
    }
}

function sendDmToUserId(userId, message) {
    slackClient.openDM(userId, function(result) {
        if (result != null && result.ok) {
            sendMessageToChannel(result.channel.id, message);
        }
    });
}

function pullRequestReminderJobStep1() {
    redis.hkeys("repoUsers", function(err, result) {
        if (err == null && result != null) {
            result.forEach(function(repoFullName) {
                redis.hget("repoUsers", repoFullName, function(_err, _result) {
                    if (_err == null && _result != null) {
                        var slackUserIdSet = new Set(JSON.parse(_result));
                        pullRequestReminderJobStep2(repoFullName, slackUserIdSet);
                    }
                });
            });
        }
    });
}

function pullRequestReminderJobStep2(repoFullName, slackUserIdSet) {
    gitHubPullRequest.getOpenPullRequestList(repoFullName, function(err, resp, bodyString) {
        var body = JSON.parse(bodyString);
        body.forEach(function(pullRequest) {
            pullRequestReminderJobStep3(repoFullName, slackUserIdSet, pullRequest);
        });
    });
}

function pullRequestReminderJobStep3(repoFullName, slackUserIdSet, pullRequest) {
    gitHubPullRequest.getPullRequestReviewCommentList(repoFullName, pullRequest.number, function(err, resp, bodyString) {
        var body = JSON.parse(bodyString);
        pullRequestReminderJobStep4(repoFullName, slackUserIdSet, pullRequest, body);
    });
}

function pullRequestReminderJobStep4(repoFullName, slackUserIdSet, pullRequest, reviewComments) {
    gitHubPullRequest.getPullRequestIssueCommentList(repoFullName, pullRequest.number, function(err, resp, bodyString) {
        var body = JSON.parse(bodyString);
        pullRequestReminderJobStep5(repoFullName, slackUserIdSet, pullRequest, reviewComments, body);
    });
}

function pullRequestReminderJobStep5(repoFullName, slackUserIdSet, pullRequest, reviewComments, issueComments) {
    gitHubLabel.getLabelList(repoFullName, pullRequest.number, function(err, resp, bodyString) {
        var body = JSON.parse(bodyString);
        if (!body.find(function(label) {
            return label.name == "reviewed";
        })) {
            var slackUserIds = Array.from(slackUserIdSet);

            slackUserIds.forEach(function(slackUserId) {
                redis.hget("userGithubLogins", slackUserId, function(_err, _result) {
                    if (_err == null) {
                        if (_result == null) {
                            sendDmToUserId(slackUserId, "Dude I can't check unreviewed Pull Request because your Github Login is not mapped. Please notify the admin.");
                        } else {
                            var githubLogin = _result;

                            if (!reviewComments.find(function(comment, index, array) {
                                return comment.user.login == githubLogin;
                            }) && !issueComments.find(function(comment, index, array) {
                                return comment.user.login == githubLogin;
                            })) {
                                var slackUser = slackClient.getUserByID(slackUserId);
                                logger.info("notifying slackUser: " + slackUser.name + " to review pullRequest: " + pullRequest.number)
                                sendDmToUserId(slackUserId, "Gays, kindly please review this Pull Request: "  + pullRequest.title + "(#" + pullRequest.number + "), author: " + pullRequest.user.login + ", url: " + pullRequest.html_url);
                            }
                        }
                    }
                });
            });
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
        sendRepoNotification(pullRequest.repoFullName, buildPullRequestExpiredMessage(pullRequest), callback);
    }
};
