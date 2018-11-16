'use strict';

const Module = require('../lib/Module');
const App = require('../lib/App');
const Promise = require("bluebird");
const Telegraf = require('telegraf');
const commandParts = require('telegraf-command-parts');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');

module.exports = class Telegram extends Module {

    init() {
        return new Promise((resolve, reject) => {
            this.log.info("Initializing...");

            this.bot = new Telegraf(this.config.token);
            this.bot.use(commandParts());

            this.bot.command('status', (ctx) => this.commandStatus(ctx));
            this.bot.command('led', (ctx) => this.commandLed(ctx));
            this.bot.action(/led (on|off)/, (ctx) => this.actionLed(ctx));

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

    commandStatus(ctx) {
        App.modules.um3.getStatus().then((status) => {
            ctx.reply("Printer is currently: " + status);
        }, (err) => {
            ctx.reply("An error occured: " + err.toString());
            this.log.error(err.toString());
        });
    }

    commandLed(ctx) {
        // Reply with Keyboard
        return ctx.reply('Turn LEDs on or off?', Extra.HTML().markup((m) =>
            m.inlineKeyboard([
                m.callbackButton('On', 'led on'),
                m.callbackButton('Off', 'led off')
            ])
        ));
    }

    actionLed(ctx) {
        const state = ctx.match[1] ? ctx.match[1].toLowerCase() : null;

        if (state == 'on' || state == 'off') {
            return App.modules.um3.toggleLED(state).then(() => {
                ctx.answerCbQuery('LEDs turned ' + state);
            }, (err) => {
                ctx.reply("An error occured: " + err.toString());
                this.log.error(err.toString());
            });
        } else {
            ctx.answerCbQuery('Not supported!');
        }
    }
};
