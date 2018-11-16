'use strict';

const Module = require('../lib/Module');
const App = require('../lib/App');
const Promise = require("bluebird");
const Telegraf = require('telegraf');
const commandParts = require('telegraf-command-parts');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const Tools = require('../lib/Tools');

module.exports = class Telegram extends Module {

    init() {
        return new Promise((resolve, reject) => {
            this.log.info("Initializing...");

            this.bot = new Telegraf(this.config.token);
            this.bot.use(commandParts());

            this.bot.command('status', (ctx) => this._handle(ctx, this.commandStatus, true));
            this.bot.command('led', (ctx) => this._handle(ctx, this.commandLed, true));
            this.bot.command('blink', (ctx) => this._handle(ctx, this.commandBlink, true));
            this.bot.command('color', (ctx) => this._handle(ctx, this.commandColor, true));

            this.bot.action(/led (on|off)/, (ctx) => this._handle(ctx, this.actionLed, true));
            
            this.bot.start((ctx) => this._handle(ctx, this.commandStart, false));

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

    commandStart(ctx) {
        const userId = ctx.from.id;

        ctx.reply("Welcome to Ultimaker 3 Telegram Bot.\nYour user ID is " + userId + "\nPlease add it to the configuration file and secure your bot!");
    }

    commandStatus(ctx) {
        return App.modules.um3.getStatus().then((status) => {
            ctx.reply("Printer is currently: " + status);
        }, (err) => {
            ctx.reply("An error occured: " + err.toString());
            this.log.error(err.toString());
        });            
    }

    commandLed(ctx, state) {
        if (state) {
            state = state.toLowerCase();
            if (state != 'on' && state != 'off') {
                return ctx.reply("Not a valid LED state: " + state);
            }

            return App.modules.um3.toggleLED(state).then(() => {
                return ctx.reply('LEDs turned ' + state);
            }, (err) => {
                this.log.error(err.toString());
                return ctx.reply("An error occured: " + err.toString());
            });
        }

        if (!state) {
            // Reply with Keyboard
            return ctx.reply('Turn LEDs on or off?', Extra.HTML().markup((m) => {
                return m.inlineKeyboard([
                    m.callbackButton('On', 'led on'),
                    m.callbackButton('Off', 'led off')
                ])
            }));
        }
    }

    commandColor(ctx, red, green, blue) {
        const hexResult = Tools.hexToRgb(red);

        if (!hexResult) {
            red = parseInt(red);
            green = parseInt(green);
            blue = parseInt(blue);
        }
        
        if (!hexResult && (isNaN(red) || isNaN(green) || isNaN(blue))) {
            return ctx.reply("Please specify a hex color or three individual color values! /color RRGGBB - /color RR GG BB");
        }

        if (hexResult) {
            red = hexResult.red;
            green = hexResult.green;
            blue = hexResult.blue;
        }

        const result = Tools.rgbToHsv(red, green, blue);

        return App.modules.um3.color(result.hue * 100, result.saturation * 100, result.value * 100).then(() => {
            return ctx.reply('Color changed');
        }, (err) => {
            this.log.error(err.toString());
            return ctx.reply("An error occured: " + err.toString());
        });
    }

    commandBlink(ctx, amount) {
        if (isNaN(amount) || !(amount > 0)) {
            return ctx.reply("Please specify the amount of blinks (must be greater 0)! /blink <amount>");
        }

        return App.modules.um3.blink(1, amount).then(() => {
            return;
        }, (err) => {
            ctx.reply("An error occured: " + err.toString());
            this.log.error(err.toString());
        });
    }

    actionLed(ctx, state) {
        state = state ? state.toLowerCase() : "";

        ctx.editMessageReplyMarkup(null);

        if (state == 'on' || state == 'off') {
            return App.modules.um3.toggleLED(state).then(() => {
                ctx.editMessageText('LEDs turned ' + state);
                ctx.answerCbQuery('LEDs turned ' + state);
            }, (err) => {
                ctx.answerCbQuery("An error occured: " + err.toString());
                this.log.error(err.toString());
            });
        } else {
            ctx.answerCbQuery('Not supported!');
        }
    }
};
