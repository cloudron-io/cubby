'use strict';

var fs = require('fs'),
    async = require('async'),
    path = require('path');

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
    var schema = fs.readFileSync(path.join(__dirname, 'initial-schema.sql')).toString('utf8');
    var statements = schema.split(';');
    async.eachSeries(statements, function (statement, callback) {
        if (statement.trim().length === 0) return callback(null);
        db.runSql(statement, callback);
    }, callback);
};

exports.down = function(db, callback) {
    db.runSql('DROP TABLE users, tokens, clients, apps, appPortBindings, authcodes, settings', callback);
};

exports._meta = {
  "version": 1
};
