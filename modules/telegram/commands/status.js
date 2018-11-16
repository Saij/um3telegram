'use strict';
const App = require('../../../lib/App');

module.exports = function(ctx) {
    return App.modules.um3.getStatus().then((status) => {
        ctx.reply("Printer is currently: " + status);
    }, (err) => {
        ctx.reply("An error occured: " + err.toString());
        this.log.error(err.toString());
    });            
}