var Slack, autoMark, autoReconnect, slack, slackToken;
Slack = require('slack-client');

slackToken = 'xoxb-11844189043-DozoGuO6L6zmENZ0cdIQlzv0';
autoReconnect = true;
autoMark = true;

slack = new Slack(slackToken, autoReconnect, autoMark);

slack.on('open', function() {
    return console.log("Connected to " + slack.team.name + " as @" + slack.self.name);
});

slack.on('message', function(message) {
    var channel = slack.getChannelGroupOrDMByID(message.channel);
    channel.send("Wuzzup gays?")
    return console.log(message);
});

slack.on('error', function(err) {
    return console.error("Error", err);
});

slack.login();
