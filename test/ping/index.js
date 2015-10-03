/*global describe:false, it:false, beforeEach:false, afterEach:false*/

'use strict';


var kraken = require('kraken-js'),
    express = require('express'),
    path = require('path'),
    request = require('supertest');


describe('ping', function () {

    var app, mock;

    beforeEach(function (done) {
        app = express();
        app.on('start', done);
        app.use(kraken({
            basedir: path.resolve(__dirname, '../..')
        }));

        mock = app.listen(1337);

    });

    afterEach(function (done) {
        mock.close(done);
    });

    it('should say "pong"', function (done) {
        request(mock)
            .get('/ping')
            .expect(200)
            .expect('Content-Type', /html/)
                .expect(/pong/)
            .end(function (err, res) {
                done(err);
            });
    });

});
