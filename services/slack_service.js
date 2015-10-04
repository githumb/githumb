var Slack, GithumbBot, autoMark, autoReconnect, slack, slackToken, githumbBot;
Slack = require('slack-client');
slackToken = 'xoxb-11844189043-DozoGuO6L6zmENZ0cdIQlzv0';
autoReconnect = true;
autoMark = true;

var SlackService = function () {
    var slack;

    var getSlackClient = function () {
        return slack;
    }

    var start = function () {
        slack = new Slack(slackToken, autoReconnect, autoMark);

        slack.on('open', function () {
            return console.log('Connect successfully');
        });

        slack.on('message', function (message) {
            return console.log('Got a message!')
        });

        slack.on('error', function (err) {
            return console.log("Error", err);
        });

        slack.login();
    }

    return {
        getSlackClient: getSlackClient,
        start: start
    };
};

module.exports = SlackService();
