var Slack = require('slack-client');
var Log = require('log');

var logger = new Log('info');

var slackToken = 'xoxb-11844189043-DozoGuO6L6zmENZ0cdIQlzv0';
var autoReconnect = true;
var autoMark = true;

module.exports = function(onMessageHandler) {
    var slack = new Slack(slackToken, autoReconnect, autoMark);

    slack.on('open', function () {
        return logger.info("Connected to " + slack.team.name + " as @" + slack.self.name);
    });

    slack.on('message', onMessageHandler);

    slack.on('error', function (err) {
        return console.log("Error", err);
    });

    slack.login();

    return slack;
}
