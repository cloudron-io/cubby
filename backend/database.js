'use strict';

exports = module.exports = {
    init,
    query,
    transaction
};

var assert = require('assert'),
    async = require('async'),
    MainError = require('./mainerror.js'),
    debug = require('debug')('cubby:database'),
    pg = require('pg'),
    once = require('once'),
    util = require('util');

var gConnectionPool = null;

const gDatabase = {
    hostname: process.env.CLOUDRON_POSTGRESQL_HOST || '127.0.0.1',
    username: process.env.CLOUDRON_POSTGRESQL_USERNAME || 'root',
    password: process.env.CLOUDRON_POSTGRESQL_PASSWORD || 'password',
    port: process.env.CLOUDRON_POSTGRESQL_PORT || 3306,
    name: process.env.CLOUDRON_POSTGRESQL_DATABASE || 'cubby'
};

function init(callback) {
    assert.strictEqual(typeof callback, 'function');

    if (gConnectionPool !== null) return callback(null);

    gConnectionPool = new pg.Pool({
        host: gDatabase.hostname,
        user: gDatabase.username,
        password: gDatabase.password,
        database: gDatabase.name,
        port: gDatabase.port,
    });

    // the pool will emit an error on behalf of any idle clients
    // it contains if a backend error or network partition happens
    gConnectionPool.on('error', function (error, client) {
        console.error('Unexpected error on idle client', error)
    });

    callback(null);
}

function query() {
    const args = Array.prototype.slice.call(arguments);
    const callback = args[args.length - 1];
    assert.strictEqual(typeof callback, 'function');

    if (!gConnectionPool) return callback(new MainError(MainError.DATABASE_ERROR, 'database.js not initialized'));

    gConnectionPool.query.apply(gConnectionPool, args); // this is same as getConnection/query/release
}

function transaction(queries, callback) {
    assert(util.isArray(queries));
    assert.strictEqual(typeof callback, 'function');

    return callback(new MainError(MainError.DATABASE_ERROR, 'transactions not yet ported to psql'));

    callback = once(callback);

    gConnectionPool.getConnection(function (error, connection) {
        if (error) return callback(error);

        const releaseConnection = (error) => { connection.release(); callback(error); };

        connection.beginTransaction(function (error) {
            if (error) return releaseConnection(error);

            async.mapSeries(queries, function iterator(query, done) {
                connection.query(query.query, query.args, done);
            }, function seriesDone(error, results) {
                if (error) return connection.rollback(() => releaseConnection(error));

                connection.commit(function (error) {
                    if (error) return connection.rollback(() => releaseConnection(error));

                    connection.release();

                    callback(null, results);
                });
            });
        });
    });
}
