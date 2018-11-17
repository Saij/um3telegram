'use strict';

const Module = require('../lib/Module');
const App = require('../lib/App');
const Promise = require("bluebird");
const Telegraf = require('telegraf');
const commandParts = require('telegraf-command-parts');

module.exports = class Telegram extends Module {

    init() {
        return new Promise((resolve, reject) => {
            this.log.info("Initializing...");

            this.bot = new Telegraf(this.config.token);
            this.bot.use(commandParts());

            this.bot.command('status', (ctx) => this._handle(ctx, require('./telegram/commands/status'), true));
            this.bot.command('led', (ctx) => this._handle(ctx, require('./telegram/commands/led'), true));
            this.bot.command('blink', (ctx) => this._handle(ctx, require('./telegram/commands/blink'), true));
            this.bot.command('color', (ctx) => this._handle(ctx, require('./telegram/commands/color'), true));
            this.bot.command('video', (ctx) => this._handle(ctx, require('./telegram/commands/video'), true));
            this.bot.command('photo', (ctx) => this._handle(ctx, require('./telegram/commands/photo'), true));
            this.bot.command('timelapse', (ctx) => this._handle(ctx, require('./telegram/commands/timelapse'), true));

            this.bot.action(/led (on|off)/, (ctx) => this._handle(ctx, require('./telegram/actions/led'), true));
            
            this.bot.start((ctx) => this._handle(ctx, require('./telegram/commands/start'), false));

            resolve(this);
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            this.log.info("Starting...");

            this.bot.startPolling();
            resolve(this);
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            this.log.info("Stopping...");
            this.bot.stop(() => {
                resolve(this);
            })
        });
    }

    _handle(ctx, cb, needAuth) {
        let authPromise = Promise.resolve(true);
        if (needAuth) {
            authPromise = this._checkAuth(ctx);
        }
        
        return authPromise.then((result) => {
            if (!result) {
                return Promise.resolve();
            }

            const matched = ctx.match ? ctx.match.slice(1) : [];
            const args = ctx.contextState.command ? ctx.contextState.command.splitArgs : matched;

            return cb.call(this, ctx, ...args);
        })
    }

    _checkAuth(ctx) {
        return new Promise((resolve) => {
            const userId = ctx.from.id;
            const result = this.config.users.filter((v) => v == userId).length > 0;
            if (!result) {
                this.log.warn("User " + ctx.from.first_name + " (" + ctx.from.username + ") tried to acces the bot!");
                ctx.reply("You are not authorized to use this bot!");            
                return resolve(false);
            }

            return resolve(true);
        });
    }  

    _updateMessage(ctx, msg, text) {
        return ctx.telegram.editMessageText(
            msg.chat.id,
            msg.message_id,
            undefined,
            text,
            undefined
        )
    }

};
