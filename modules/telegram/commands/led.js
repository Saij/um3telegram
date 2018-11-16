'use strict';
const App = require('../../../lib/App');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');

module.exports = function(ctx, state) {
    if (state) {
        state = state.toLowerCase();
        if (state != 'on' && state != 'off') {
            return ctx.reply("Not a valid LED state: " + state);
        }

        return App.modules.um3.toggleLED(state).then(() => {
            return ctx.reply('LEDs turned ' + state);
        }, (err) => {
            //this.log.error(err.toString());
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