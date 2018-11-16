'use strict';
const App = require('../../../lib/App');

module.exports = function(ctx, amount) {
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