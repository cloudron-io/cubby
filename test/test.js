#!/usr/bin/env node

'use strict';

/* jshint esversion: 8 */
/* global describe */
/* global before */
/* global after */
/* global it */
/* global xit */

require('chromedriver');

const execSync = require('child_process').execSync,
    expect = require('expect.js'),
    path = require('path'),
    { Builder, By, Key, until } = require('selenium-webdriver'),
    { Options } = require('selenium-webdriver/chrome');

if (!process.env.USERNAME || !process.env.PASSWORD) {
    console.log('USERNAME and PASSWORD env vars need to be set');
    process.exit(1);
}

describe('Application life cycle test', function () {
    this.timeout(0);

    const EXEC_ARGS = { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' };
    const LOCATION = 'test';
    const USERNAME = process.env.USERNAME;
    const PASSWORD = process.env.PASSWORD;
    const TEST_TIMEOUT = parseInt(process.env.TIMEOUT, 10) || 10000;

    let browser, app;

    before(function () {
        const options = new Options().windowSize({ width: 1280, height: 1024 });
        if (process.env.HEADLESS) options.addArguments('headless');
        browser = new Builder().forBrowser('chrome').setChromeOptions(options).build();
    });

    after(function () {
        browser.quit();
    });

    function getAppInfo() {
        var inspect = JSON.parse(execSync('cloudron inspect'));
        app = inspect.apps.filter(function (a) { return a.location.indexOf(LOCATION) === 0; })[0];
        expect(app).to.be.an('object');
    }

    async function waitForElement(elem) {
        await browser.wait(until.elementLocated(elem), TEST_TIMEOUT);
        await browser.wait(until.elementIsVisible(browser.findElement(elem)), TEST_TIMEOUT);
    }

    async function login() {
        await browser.manage().deleteAllCookies();
        await browser.get('https://' + app.fqdn);
        await browser.sleep(2000);
        await waitForElement(By.id('usernameInput'));
        await browser.findElement(By.id('usernameInput')).sendKeys(USERNAME);
        await browser.findElement(By.xpath('//div[@id="passwordInput"]/input')).sendKeys(PASSWORD);
        await browser.findElement(By.id('loginButton')).click();
        await waitForElement(By.className('profile-actions'));
    }

    async function logout() {
        await browser.get('https://' + app.fqdn);
        await browser.sleep(2000);
        await waitForElement(By.className('profile-actions'));
        await browser.findElement(By.className('profile-actions')).click();
        await waitForElement(By.xpath('//span[text()="Logout"]'));
        await browser.findElement(By.xpath('//span[text()="Logout"]')).click();
        await waitForElement(By.id('loginButton'));
    }

    xit('build app', function () { execSync('cloudron build', EXEC_ARGS); });
    it('install app', function () { execSync(`cloudron install --location ${LOCATION}`, EXEC_ARGS); });

    it('can get app information', getAppInfo);
    it('can login', login);
    it('can logout', logout);

    it('can restart app', function () { execSync(`cloudron restart --app ${app.id}`, EXEC_ARGS); });

    it('can login', login);
    it('can logout', logout);

    it('backup app', function () { execSync(`cloudron backup create --app ${app.id}`, EXEC_ARGS); });
    it('restore app', function () {
        const backups = JSON.parse(execSync('cloudron backup list --raw --app ' + app.id));
        execSync('cloudron uninstall --app ' + app.id, EXEC_ARGS);
        execSync('cloudron install --location ' + LOCATION, EXEC_ARGS);
        getAppInfo();
        execSync(`cloudron restore --backup ${backups[0].id} --app ${app.id}`, EXEC_ARGS);
    });

    it('can login', login);
    it('can logout', logout);

    it('move to different location', async function () {
        await browser.get('about:blank');
        execSync(`cloudron configure --location ${LOCATION}2 --app ${app.id}`, EXEC_ARGS);
    });

    it('can get app information', getAppInfo);
    it('can login', login);
    it('can logout', logout);

    it('uninstall app', async function () {
        await browser.get('about:blank');
        execSync(`cloudron uninstall --app ${app.id}`, EXEC_ARGS);
    });

    // test update
    it('install app for update', function () { execSync(`cloudron install --appstore-id io.cloudron.cubby --location ${LOCATION}`, EXEC_ARGS); });

    it('can get app information', getAppInfo);
    it('can login', login);
    it('can logout', logout);

    it('can update', function () { execSync(`cloudron update --app ${app.id}`, EXEC_ARGS); });
    it('can get app information', getAppInfo);

    it('can login', login);
    it('can logout', logout);

    it('uninstall app', async function () {
        await browser.get('about:blank');
        execSync(`cloudron uninstall --app ${app.id}`, EXEC_ARGS);
    });
});
