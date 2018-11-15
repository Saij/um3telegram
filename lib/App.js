'use strict';

// @IMPORTS
const fs = require('fs');
const os = require('os');
const winston = require('winston');
const moment = require('moment');
const merge = require('merge');
const Tools = require('./Tools.js');
const Promise = require('bluebird');

module.exports = class App {

    constructor() {
        throw 'Cannot construct singleton';
    }

    static stop() {
        return App.stopModules().then(() => {
            process.exit(0);
        }, (err) => {
            this.log.error(err);
            process.exit(1);
        });
    }

    static configure(config) {
        this.config = merge.recursive({
            logFormat: 'dddd, MMMM Do YYYY, hh:mm:ss a',
            logLevelConsole: 'debug',
            logLevelFile: 'info',
            logDisabled: false,
            appName: 'Application'
        }, config);
        this.moduleObjs = [];
        this.modules = {};

        winston.setLevels({
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        });

        winston.addColors({
            debug: 'blue',
            info: 'grey',
            warn: 'yellow',
            error: 'red'
        });

        this.log = this.getLogger(this.config.appName);

        Promise.onPossiblyUnhandledRejection((err) => {
            this.log.error(err);
        });

        process.on('uncaughtException', (err) => {
            this.log.error(err);
        })
    }

    static getLogger(name) {

        try {
            fs.accessSync(this.config.logDir, fs.R_OK);
        } catch (e) {
            try {
                fs.mkdirSync(this.config.logDir);
            } catch (err) {
                console.error(e);
                console.error(err);
            }
        }

        let transports = [];
        if (!App.config.logDisabled) {
            transports = [
                new winston.transports.Console({
                    level: App.config.logLevelConsole,
                    colorize: true,
                    json: false,
                    label: name.toUpperCase(),
                    timestamp: () => {
                        return moment().format(this.config.logFormat);
                    }
                }),
                new winston.transports.File({
                    level: App.config.logLevelFile,
                    colorize: false,
                    json: false,
                    label: name.toUpperCase(),
                    timestamp: () => {
                        return moment().format(this.config.logFormat);
                    },
                    filename: this.config.logDir + '/' + name + '.log'
                })
            ]
        }

        return new (winston.Logger)({
            transports: transports
        });
    }

    static loadModuleConfig(moduleName, defaultConfig) {
        const configJsonLocation = this.config.configPath + '/' + moduleName + '.json';
        const localConfigJsonLocation = this.config.configPath + '/' + moduleName + '.local.json';
        let localConfig = {};
        let config = {};

        if (!fs.existsSync(this.config.configPath)) {
            fs.mkdirSync(this.config.configPath);
        }

        if (!fs.existsSync(configJsonLocation)) {
            fs.writeFileSync(configJsonLocation, JSON.stringify(defaultConfig));
        }

        try {
            config = Tools.loadCommentedConfigFile(configJsonLocation);
        } catch (e) {
            throw new Error('Config of module ' + moduleName + ' contains invalid JSON data: ' + e.toString());
        }

        if (fs.existsSync(localConfigJsonLocation)) {
            localConfig = Tools.loadCommentedConfigFile(localConfigJsonLocation);
        }

        config = merge.recursive(config, localConfig);
        return config;
    }

    static saveModuleConfig(moduleName, config) {
        const localConfigJsonLocation = this.config.configPath + '/' + moduleName + '.local.json';

        if (!fs.existsSync(this.config.configPath)) {
            fs.mkdirSync(this.config.configPath);
        }

        fs.writeFileSync(localConfigJsonLocation, JSON.stringify(config));
    }

    static registerModule(moduleName, moduleClass) {
        const moduleConfig = this.loadModuleConfig(moduleName, moduleClass.defaultConfig());

        let moduleObj = {
            name: moduleName,
            config: moduleConfig
        };
        let moduleInstance;

        try {
            moduleInstance = new moduleClass(moduleName, moduleConfig, moduleObj);
        } catch (e) {
            throw e;
        }

        moduleObj.instance = moduleInstance;

        this.moduleObjs.push(moduleObj);
        this.modules[moduleName] = moduleInstance;

        return moduleInstance;
    }

    static initModules() {
        return new Promise((resolve, reject) => {
            this.log.info('Initializing Modules');

            Promise.each(this.moduleObjs, (moduleObj, index, length) => {
                return moduleObj.instance.init();
            }).then(function () {
                resolve();
            }, function (err) {
                reject(err);
            });
        });
    }

    static startModules() {
        return new Promise((resolve, reject) => {
            this.log.info('Starting Modules');

            Promise.each(this.moduleObjs, (moduleObj, index, length) => {
                return moduleObj.instance.start();
            }).then(function () {
            	App._modulesStarted = true;
                resolve();
            }, function (err) {
                reject(err);
            });
        });
    }

    static stopModules() {
        return new Promise((resolve, reject) => {
        	if (!App._modulesStarted) {
        		return resolve();
        	}

            this.log.info('Stopping Modules');

            App._modulesStarted = false;
            Promise.each(this.moduleObjs, (moduleObj, index, length) => {
                return moduleObj.instance.stop();
            }).then(function () {
                resolve();
            }, function (err) {
                reject(err);
            });
        });
    }

    static run() {
        this.initModules().then(() => {
            return this.startModules();
        }).then(() => {
            this.log.info('Application started');

            if (typeof process !== 'undefined' && process.send) {
                process.send({
                    status: 'ready'
                });
                process.send('ready');
            }
        }, (err) => {
            if (!err) {
                err = new Error('Unkown error!');
            }

            this.log.error(err);
            App.stop();
        });
    }

};