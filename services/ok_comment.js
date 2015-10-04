'use strict';

models.exports = function(redis) {

  redis.get(pullId, function(err, result) {
    console.log(result);

    var pull = parsePull(pullId, result);

    redis.set(pullId, JSON.stringify(incrementOk(pull)));

    res.send('OK');

    console.log('\n===end of request===\n');
  });

  function parsePull(id, result) {
    if (result == null) {
      return {
        id: id,
        current_ok: 0,
        total_ok: 0
      };
    }
    return JSON.parse(result);
  }

  function incrementOk(pull) {
    pull.current_ok += 1;
    pull.total_ok += 1;

    return pull;
  }

};
