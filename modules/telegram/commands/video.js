'use strict';
const App = require('../../../lib/App');
const Tools = require('../../../lib/Tools');
const fs = require('fs');
const request = require('request');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

module.exports = function(ctx, duration) {
    if (isNaN(duration) || !(duration > 0)) {
        return ctx.reply("Please specify the duration of the video (must be greate 0)! /video <duration>");
    }

    let currentMessage = "Creating video from stream";
    let curDots = 1;
    let interval;
    let statusMsg;

    const stopUpdateFunction = (msg) => {
        clearTimeout(interval);
        return this._updateMessage(ctx, statusMsg, msg);
    }

    return ctx.reply(Tools.addDots(currentMessage, curDots)).then((msg) => {
        statusMsg = msg;
        const timeoutFunction = () => {
            curDots++;
            if (curDots > 3) {
                curDots = 1;
            }

            this._updateMessage(ctx, statusMsg, Tools.addDots(currentMessage, curDots)).then(() => {
                interval = setTimeout(timeoutFunction, 1000);
            }, (err) => {
                interval = setTimeout(timeoutFunction, 1000);
            });
        };

        interval = setTimeout(timeoutFunction, 1000);

        // now create ffmpeg and process video
        return App.modules.um3.getStreamURL();
    }).then((streamUrl) => {
        return new Promise((resolve, reject) => {
            const tmpFile = App.config.dataPath + "/" + statusMsg.message_id + ".mp4";
            const convertProc = ffmpeg(streamUrl);
            convertProc.setFfmpegPath(ffmpegStatic.path);
            convertProc.videoCodec('libx264');
            convertProc.noAudio();
            convertProc.duration(duration);
            convertProc.on('error', (err) => {
                return reject(err);
            });
            convertProc.on('end', () => {
                return resolve(tmpFile);
            });
            convertProc.save(tmpFile);
        }).then((filename) => {
            return ctx.replyWithVideo({source: filename}).then(() => {
                return new Promise((resolve, reject) => {
                    fs.unlink(filename, (err) => {
                        if (err) {
                            return reject(err);
                        }

                        return resolve();
                    });
                }).then(() => {
                    return ctx.telegram.deleteMessage(statusMsg.chat.id, statusMsg.message_id);
                });
            });
        }, (err) => {
            return stopUpdateFunction("Error: " + err.toString());
        })
    });
}