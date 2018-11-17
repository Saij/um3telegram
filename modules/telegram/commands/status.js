'use strict';
const App = require('../../../lib/App');
const PhotoCommand = require('./photo');
const format = require("string-template")

const msg = `
Status: {status}
Heat Bed Temperature: {bedCurr}/{bedTarget}
Core 1: {core1Type} => {core1TempCurr}/{core1TempTarget}
Core 2: {core2Type} => {core2TempCurr}/{core2TempTarget}
`;

module.exports = function(ctx) {
	return App.modules.um3.getPrinter().then((printer) => {
		const formatParams = {
			status: printer.status,
			bedCurr: printer.bed.temperature.current,
			bedTarget: printer.bed.temperature.target,
			core1Type: printer.heads[0].extruders[0].hotend.id,
			core1TempCurr: printer.heads[0].extruders[0].hotend.temperature.current,
			core1TempTarget: printer.heads[0].extruders[0].hotend.temperature.target,
			core2Type: printer.heads[0].extruders[1].hotend.id,
			core2TempCurr: printer.heads[0].extruders[1].hotend.temperature.current,
			core2TempTarget: printer.heads[0].extruders[1].hotend.temperature.target
		}

		return PhotoCommand(ctx, format(msg, formatParams));
	}).catch((err) => {
        ctx.reply("An error occured: " + err.toString());
        this.log.error(err.toString());
    })
}