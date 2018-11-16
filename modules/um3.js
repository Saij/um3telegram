'use strict';

const Module = require('../lib/Module');
const App = require('../lib/App');
const Promise = require("bluebird");
const request = require('request-promise');

module.exports = class UM3 extends Module {

    init() {
        return new Promise((resolve, reject) => {
            this.log.info("Initializing...");
            this.authorized = false;

            this.baseRequestOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                json: true
            }

            return resolve(this);
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            this.log.info("Starting...");

            let authPromise = Promise.resolve();

            if (!this.config.auth) {
                this.config.auth = {id: "", key: ""};
            }
            if (!this.config.auth.id || !this.config.auth.key) {
                // Request new auth
                authPromise = request(Object.assign(this.baseRequestOptions, {
                    method: "POST",
                    uri: this.config.baseUrl + "api/v1/auth/request",
                    formData: {
                        application: "UM3Bot", 
                        user: "UM3Bot"
                    }
                })).then((response) => {
                    this.config.auth.id = response.id;
                    this.config.auth.key = response.key;

                    // Writing config
                    App.saveModuleConfig(this.name, this.config);
                }, reject);
            }

            authPromise.then(() => {
                return this.checkAuth();
            }).then(() => {
                resolve(this);
            }, (err) => {
                return reject(err);
            });
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            this.log.info("Stopping...");
            resolve(this);
        });
    }

    checkAuth() {
        return new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                this.log.info("Awaiting authorization...");
                request(Object.assign(this.baseRequestOptions, {
                    method: "GET",
                    uri: this.config.baseUrl + "api/v1/auth/check/" + this.config.auth.id
                })).then((response) => {
                    const message = response.message;

                    if (message == "authorized") {
                        clearInterval(interval);
                        this.authorized = true;
                        this.log.info("Authorized!");
                        return resolve();
                    } else if (message == "unauthorized") {
                        clearInterval(interval);
                        this.log.error("Not authorized!");
                        return reject(new Error("Not authorized"));
                    }
                }, (err) => {
                    clearInterval(interval);
                    this.log.error("Error checking authentification!");
                    return reject(err);
                })
            }, 1000);
        });
    }

    getStatus() {
        return new Promise((resolve, reject) => {
            if (!this.authorized) {
                return reject(new Error("Not authorized"));
            }

            request(Object.assign(this.baseRequestOptions, {
                methon: "GET",
                uri: this.config.baseUrl + "api/v1/printer/status",
            })).then((response) => {
                return resolve(response);
            })
        })
    }

    toggleLED(state) {
        return new Promise((resolve, reject) => {
            if (!this.authorized) {
                return reject(new Error("Not authorized"));
            }

            if (state != 'on' && state != 'off') {
                return reject(new Error('State "' + state + '" is not supported for LED control'));
            }

            const brightness = state == 'on' ? 100 : 0;

            request(Object.assign(this.baseRequestOptions, {
                method: "PUT",
                uri: this.config.baseUrl + "api/v1/printer/led",
                body: {
                    hue: 0, 
                    saturation: 0, 
                    brightness: brightness
                }
            })).auth(this.config.auth.id, this.config.auth.key, false).then((response) => {
                return resolve();
            }, reject);
        });
    }

    color(hue, saturation, value) {
        return new Promise((resolve, reject) => {
            if (!this.authorized) {
                return reject(new Error("Not authorized"));
            }

            request(Object.assign(this.baseRequestOptions, {
                method: "PUT",
                uri: this.config.baseUrl + "api/v1/printer/led",
                body: {
                    hue: hue, 
                    saturation: saturation, 
                    brightness: value
                }
            })).auth(this.config.auth.id, this.config.auth.key, false).then((response) => {
                return resolve();
            }, reject);
        });
    }

    blink(frequency, amount) {
        return new Promise((resolve, reject) => {
            if (!this.authorized) {
                return reject(new Error("Not authorized"));
            }

            if (isNaN(frequency) || !(frequency > 0)) {
                return reject(new Error('Not a valid frequency provided!'));
            }

            if (isNaN(amount) || !(amount > 0)) {
                return reject(new Error('Not a valid amount provided!'));
            }

            request(Object.assign(this.baseRequestOptions, {
                method: "POST",
                uri: this.config.baseUrl + "api/v1/printer/led/blink",
                body: {
                    frequency: frequency,
                    count: amount
                }
            })).auth(this.config.auth.id, this.config.auth.key, false).then((response) => {
                return resolve();
            }, reject);
        })
    }

    getStreamURL() {
        return new Promise((resolve, reject) => {
            request(Object.assign(this.baseRequestOptions, {
                method: "GET",
                uri: this.config.baseUrl + "api/v1/camera/feed",
            })).then((response) => {
                return resolve(response);
            }, reject);
        })
    }

    getPhotoURL() {
        return new Promise((resolve, reject) => {
            request(Object.assign(this.baseRequestOptions, {
                method: "GET",
                uri: this.config.baseUrl + "api/v1/camera/feed",
            })).then((response) => {
                return resolve(response.replace('?action=stream', '?action=snapshot'));
            }, reject);
        })
    }

};
