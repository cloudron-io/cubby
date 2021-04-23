#!/usr/bin/env node

'use strict';

var program = require('commander'),
    database = require('./backend/database.js'),
    constants = require('./backend/constants.js'),
    MainError = require('./backend/mainerror.js'),
    users = require('./backend/users.js');

function exit(error) {
    if (error) console.error(error);
    process.exit(error ? 1 : 0);
}

async function addUser(options) {
    if (!options.username) exit('missing --username');
    if (!options.password) exit('missing --password');
    if (!options.email) exit('missing --email');
    if (!options.displayName) exit('missing --display-name');

    var user = {
        username: options.username,
        password: options.password,
        email: options.email,
        displayName: options.displayName
    };

    database.init();
    try {
        await users.add(user, constants.USER_SOURCE_LOCAL);
    } catch (error) {
        if (error.reason === MainError.ALREADY_EXISTS) exit(error.message);
        exit(error);
    }

    console.log('Done.');

    exit();
}

function editUser(options) {
    if (!options.username) exit('missing --username');
    if (!options.password) exit('missing --password');

    exit('TODO');
}

async function delUser(options) {
    if (!options.username) exit('missing --username');

    database.init();
    try {
        const user = await users.getByUsername(options.username);
        await users.remove(user.userId);
    } catch (error) {
        exit(error);
    }

    console.log('Done.');

    exit();
}

function listUsers() {
    exit('TODO');
}

program.version('0.1.0');

program.command('user-add')
    .description('Add local user')
    .option('-u --username <username>', 'Username')
    .option('-p --password <password>', 'Password')
    .option('-e --email <email>', 'email')
    .option('-d --display-name <displayName>', 'Display name')
    .action(addUser);

program.command('user-edit')
    .description('Edit local user')
    .option('-u --username <username>', 'Username')
    .option('-p --password <password>', 'New password')
    .action(editUser);

program.command('user-del')
    .description('Delete local user')
    .option('-u --username <username>', 'Username')
    .action(delUser);

program.command('users')
    .description('List local users')
    .action(listUsers);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
} else { // https://github.com/tj/commander.js/issues/338
    var knownCommand = program.commands.some(function (command) { return command._name === process.argv[2]; });
    if (!knownCommand) {
        console.error('Unknown command: ' + process.argv[2]);
        process.exit(1);
    }
}
