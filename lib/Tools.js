'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const App = require('./App.js');

module.exports = class Tools {
    constructor() {
        throw 'Cannot construct singleton';
    }

    static ensureFolderExists(path, root) {
        let parts = path.split('/');
        let curr = root;

        while (parts.length) {
            curr += '/' + parts.shift();

            if (!fs.existsSync(curr)) {
                fs.mkdirSync(curr);
            }
        }
    }

    static getConfigValueByPath(config, path, defaultValue) {
        const pathParts = path.split('.');
        let currentConfig = JSON.parse(JSON.stringify(config));

        for (var i = 0; i < pathParts.length; i++) {
            const pathPart = pathParts[i];

            if (currentConfig[pathPart]) {
                currentConfig = currentConfig[pathPart];
            } else {
                return defaultValue || null;
            }
        }

        return currentConfig;
    }

    static capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static loadCommentedConfigFile(path) {
        try {
            return this.parseCommentedJson(fs.readFileSync(path));
        } catch (e) {
            App.log.error('Error loading JSON ' + path);
        }
    }

    /**
     *
     * @param json
     */
    static parseCommentedJson(json) {
        return JSON.parse(this.minifyJson(json));
    }

    /**
     *
     * @param json
     * @returns {*}
     */
    static minifyJson(json) {
        if (json instanceof Buffer) {
            json = json.toString();
        }

        try {
            if (JSON.parse(json)) {
                return json;
            }
        } catch (e) {

        }

        let tokenizer = /'|(\/\*)|(\*\/)|(\/\/)|\n|\r/g,
            in_string = false,
            in_multiline_comment = false,
            in_singleline_comment = false,
            tmp, tmp2, new_str = [], ns = 0, from = 0, lc, rc
        ;

        tokenizer.lastIndex = 0;

        while (tmp = tokenizer.exec(json)) {
            lc = RegExp.leftContext;
            rc = RegExp.rightContext;
            if (!in_multiline_comment && !in_singleline_comment) {
                tmp2 = lc.substring(from);
                if (!in_string) {
                    tmp2 = tmp2.replace(/(\n|\r|\s)*/g, '');
                }
                new_str[ns++] = tmp2;
            }
            from = tokenizer.lastIndex;

            if (tmp[0] == '\'' && !in_multiline_comment && !in_singleline_comment) {
                tmp2 = lc.match(/(\\)*$/);
                if (!in_string || !tmp2 || (tmp2[0].length % 2) == 0) {	// start of string with ', or unescaped ' character found to end string
                    in_string = !in_string;
                }
                from--; // include ' character in next catch
                rc = json.substring(from);
            }
            else if (tmp[0] == '/*' && !in_string && !in_multiline_comment && !in_singleline_comment) {
                in_multiline_comment = true;
            }
            else if (tmp[0] == '*/' && !in_string && in_multiline_comment && !in_singleline_comment) {
                in_multiline_comment = false;
            }
            else if (tmp[0] == '//' && !in_string && !in_multiline_comment && !in_singleline_comment) {
                in_singleline_comment = true;
            }
            else if ((tmp[0] == '\n' || tmp[0] == '\r') && !in_string && !in_multiline_comment && in_singleline_comment) {
                in_singleline_comment = false;
            }
            else if (!in_multiline_comment && !in_singleline_comment && !(/\n|\r|\s/.test(tmp[0]))) {
                new_str[ns++] = tmp[0];
            }
        }
        new_str[ns++] = rc;
        return new_str.join('');
    }

    static pad(str, width) {
        const len = Math.max(0, width - str.length);
        return str + Array(len + 1).join(' ');
    }

    static formatDuration(duration) {
        const sec_num = parseInt(duration / 1000, 10); // don't forget the second param
        let hours = Math.floor(sec_num / 3600);
        let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        let seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours < 10) {
            hours = '0' + hours;
        }
        if (minutes < 10) {
            minutes = '0' + minutes;
        }
        if (seconds < 10) {
            seconds = '0' + seconds;
        }
        return hours + ':' + minutes + ':' + seconds;
    }

    static toPrecision(value, precision) {
        let precision = precision || 0,
            power = Math.pow(10, precision),
            absValue = Math.abs(Math.round(value * power)),
            result = (value < 0 ? '-' : '') + String(Math.floor(absValue / power));

        if (precision > 0) {
            const fraction = String(absValue % power),
                padding = new Array(Math.max(precision - fraction.length, 0) + 1).join('0');
            result += '.' + padding + fraction;
        }
        return result;
    }

    static getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    static getObjectValueByPath(obj, path) {
        if (typeof obj === 'undefined') {
            return;
        } else if (typeof obj !== 'object') {
            return obj;
        }

        if (path.indexOf('.') === -1) {
            return obj[path] || null;
        }

        let parts = path.split('.');
        let key = parts.shift();

        return Tools.getObjectValueByPath(obj[key], parts.join('.'));
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            red: parseInt(result[1], 16),
            green: parseInt(result[2], 16),
            blue: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHsv(r, g, b) {
        r /= 255, g /= 255, b /= 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        let d = max - min;
  
        s = max == 0 ? 0 : d / max;

        if (max == min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        return {
            hue: h,
            saturation: s,
            value: v
        };
    }
}