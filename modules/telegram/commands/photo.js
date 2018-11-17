'use strict';
const App = require('../../../lib/App');
const fs = require('fs');
const request = require('request');

module.exports = function(ctx, caption) {
    let tmpFile;
    tmpFile = App.config.dataPath + "/" + ctx.message.message_id + ".jpg";
    return App.modules.um3.takePhoto(tmpFile).then(() => {
        return ctx.replyWithPhoto({source: tmpFile}, {caption: caption});
    }).then(() => {
        return new Promise((resolve, reject) => {
            fs.unlink(tmpFile, (err) => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        })
    }).catch((err) => {
        ctx.reply("An error occured: " + err.toString());
        this.log.error(err.toString());
    });
}