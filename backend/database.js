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
    mysql = require('mysql'),
    once = require('once'),
    util = require('util');

var gConnectionPool = null;

const gDatabase = {
    hostname: process.env.CLOUDRON_MYSQL_HOST || process.env.MYSQL_IP || '127.0.0.1',
    username: process.env.CLOUDRON_MYSQL_USERNAME || 'root',
    password: process.env.CLOUDRON_MYSQL_PASSWORD || 'password',
    port: process.env.CLOUDRON_MYSQL_PORT || 3306,
    name: process.env.CLOUDRON_MYSQL_DATABASE || 'cubby'
};

function init(callback) {
    assert.strictEqual(typeof callback, 'function');

    if (gConnectionPool !== null) return callback(null);

    // https://github.com/mysqljs/mysql#pool-options
    gConnectionPool  = mysql.createPool({
        connectionLimit: 5,
        host: gDatabase.hostname,
        user: gDatabase.username,
        password: gDatabase.password,
        port: gDatabase.port,
        database: gDatabase.name,
        multipleStatements: false,
        waitForConnections: true, // getConnection() will wait until a connection is avaiable
        ssl: false,
        timezone: 'Z' // mysql follows the SYSTEM timezone. on Cloudron, this is UTC
    });

    gConnectionPool.on('connection', function (connection) {
        // connection objects are re-used. so we have to attach to the event here (once) to prevent crash
        // note the pool also has an 'acquire' event but that is called whenever we do a getConnection()
        connection.on('error', (error) => debug(`Connection ${connection.threadId} error: ${error.message} ${error.code}`));

        connection.query('USE ' + gDatabase.name);
        connection.query('SET SESSION sql_mode = \'strict_all_tables\'');
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
