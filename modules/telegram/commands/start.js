'use strict';
module.exports = function(ctx) {
    const userId = ctx.from.id;

    ctx.reply("Welcome to Ultimaker 3 Telegram Bot.\nYour user ID is " + userId + "\nPlease add it to the configuration file and secure your bot!");
}