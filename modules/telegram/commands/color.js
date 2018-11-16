'use strict';
const App = require('../../../lib/App');
const Tools = require('../../../lib/Tools');
const colorsys = require('colorsys')

module.exports = function(ctx, red, green, blue) {
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

    const result = colorsys.rgb_to_hsv({r: red, g: green, b: blue});

    return App.modules.um3.color(result.h, result.s, result.v).then(() => {
        return ctx.reply('Color changed');
    }, (err) => {
        this.log.error(err.toString());
        return ctx.reply("An error occured: " + err.toString());
    });
}