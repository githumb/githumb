'use strict';

var _ = require('underscore');
var Github = require('./external/github/label');

var github = Github('githumbot', 'githumb123');

module.exports = function(body, res, redis) {
  var pullId = body.repository.id + '-' + body.pull_request.number;
  var commentId = body.comment.id;

  console.log('pull id: ' + pullId);

  // TODO notify team new commit pushed

  redis.get(pullId, function(err, result) {
    console.log('entry on redis: ' + result);

    var reviewComment = parse(pullId, result);

    if (!_.contains(reviewComment.active_reviews, commentId)) {
      reviewComment.active_reviews.push({
        id: commentId,
        file_name: body.comment.path
      });

      github.removeLabelReviewed(body.repository.owner.login, body.repository.name, body.pull_request.number, function(err, resp, bodyString) {
        console.log("reviewed label has been removed");
      });
    }

    redis.set(pullId, JSON.stringify(reviewComment));

    res.send('OK');

    console.log('\n===end of request===\n \n\n\n\n\n');
  });

  function parse(id, result) {
    if (result == null) {
      return {
        id: id,
        active_reviews: []
      };
    }
    return JSON.parse(result);
  }
};
