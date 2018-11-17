'use strict';
const App = require('../../../lib/App');
const fs = require('fs');
const request = require('request');
const rimraf = require('rimraf');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

module.exports = function(ctx, seconds) {
    if (!this._timelapse) {
        this._timelapse = {};
    }

    if (!seconds) {
        return ctx.reply("A timelapse is currently " + (this._timelapse.active ? "active" : "not active"));
    }

    if (seconds == "stop" && this._timelapse.active) {
        // Stop active timelapse
        return this._timelapse.stop();
    }

    if (isNaN(seconds) || !(seconds > 2)) {
        return ctx.reply("Please specify the time after which is a photo taken (must be greate 2)! /timelapse <seconds>");
    }

    if (this._timelapse.active) {
        return ctx.reply("A timelapse is active at the moment!");
    }

    this._timelapse.dir = App.config.dataPath + "/" + ctx.message.message_id;
    if (!fs.existsSync(this._timelapse.dir)) {
        fs.mkdirSync(this._timelapse.dir);
    }

    this._timelapse.active = true;
    this._timelapse.picturesTaken = 0;
    this._timelapse.stop = () => {
        clearInterval(this._timelapse.interval);

        return new Promise((resolve, reject) => {
            const tmpFile = App.config.dataPath + "/" + this._timelapse.statusMsg.message_id + ".mp4";
            const convertProc = ffmpeg(this._timelapse.dir + "/%d.jpg");
            convertProc.setFfmpegPath(ffmpegStatic.path);
            convertProc.videoCodec('libx264');
            convertProc.noAudio();
            
            convertProc.on('error', (err) => {
                return reject(err);
            });
            convertProc.on('end', () => {
                return resolve(tmpFile);
            });
            convertProc.save(tmpFile);
        }).then((filename) => {
            console.log(filename);

            rimraf.sync(this._timelapse.dir);

            this._timelapse.active = false;
            this._updateMessage(ctx, this._timelapse.statusMsg, "Timelapse finished!").catch((err) => {
                this.log.warn("Error updating message: " + err.toString());
            });
        }, (err) => {
            console.log(err);
        })
    };
    this._timelapse.update = () => {
        this._updateMessage(ctx, this._timelapse.statusMsg, "Timelapse in progress. Taken pictures: " + this._timelapse.picturesTaken).catch((err) => {
            this.log.warn("Error updating message: " + err.toString());
        });
    }

    this._timelapse.interval = setInterval(() => {
        // First check if there is a print active
        App.modules.um3.getPrinterStatus().then((status) => {
            if (status == "printing") {
                // Is printing to take photo
                const file = this._timelapse.dir + "/" + (++this._timelapse.picturesTaken) + ".jpg";
                App.modules.um3.takePhoto(file).then(() => {
                    this._timelapse.update();
                }).catch((err) => {
                    this.log.warn("Error creating timelapse photos: " + err.toString());
                })
            } else {
                // Is not printing
                if (this._timelapse.active) {
                    // Print is finished so finish up timelapse
                    return this._timelapse.stop();
                } else {
                    this._updateMessage(ctx, this._timelapse.statusMsg, "No print active. Waiting for print...");
                }
            }
        });
    }, seconds * 1000);

    return ctx.reply("Starting timelapse...").then((msg) => {
        this._timelapse.statusMsg = msg;
    });
}