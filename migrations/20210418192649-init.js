'use strict';

var fs = require('fs'),
    path = require('path');

exports.up = async function(db) {
    var schema = fs.readFileSync(path.join(__dirname, 'initial-schema.sql')).toString('utf8');
    var statements = schema.split(';');

    for (let statement of statements) {
        if (statement.trim().length === 0) continue;
        await db.runSql(statement);
    }
};

exports.down = async function(db) {
    await db.runSql('DROP TABLE users, tokens, clients, apps, appPortBindings, authcodes, settings');
};

exports._meta = {
  "version": 1
};
