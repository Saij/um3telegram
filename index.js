'use strict';
const UM3Telegram = require('./lib/App');

UM3Telegram.configure({
	appName: "UM3Bot",
	logFormat: "DD.MM.YYYY hh:mm:ss",
	logLevelConsole: "info",
	
	// PATHS
    rootPath: __dirname,
    configPath: __dirname + "/config",
    logDir: __dirname + "/logs"
});

UM3Telegram.registerModule('telegram', require('./modules/telegram'));
UM3Telegram.registerModule('um3', require('./modules/um3'));

UM3Telegram.run();

process.on('SIGINT', function () {
    UM3Telegram.stop();
});

process.on('exit', function () {
    UM3Telegram.stop();
});