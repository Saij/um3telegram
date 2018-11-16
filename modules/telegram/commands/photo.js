'use strict';
const App = require('../../../lib/App');
const fs = require('fs');
const request = require('request');

module.exports = function(ctx) {
    let tmpFile;
    return App.modules.um3.getPhotoURL().then((url) => {
        tmpFile = App.config.dataPath + "/" + ctx.message.message_id + ".jpg";

        return new Promise((resolve, reject) => {
            const r = request(url).pipe(fs.createWriteStream(tmpFile));
            r.on('error', (err) => {
                return reject(err);
            });
            r.on('close', () => {
                return resolve();
            })
        });
    }).then(() => {
        return ctx.replyWithPhoto({source: tmpFile})
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