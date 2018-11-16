'use strict';
const App = require('../../../lib/App');

module.exports = function(ctx, state) {
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