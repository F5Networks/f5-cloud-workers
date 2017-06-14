/**
 * Copyright 2017 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var fsMock = require('fs');
var CloudNodesWorker = require('../../src/nodejs/cloudNodesWorker');
var loggerMock;
var providerMock;
var restOperationMock;
var nodesWorker;
var query;
var providerOptionsSent;
var bodySent;
var errorSent;
var expectedPath;

fsMock.access = function(path, mode, callback) {
    if (path === expectedPath) {
        callback();
    }
    else {
        callback(new Error());
    }
};

loggerMock = {
    severe: function() {},
    warning: function() {},
    fine: function() {},
    finest: function() {}
};

providerMock = {
    init: function(providerOptions) {
        providerOptionsSent = providerOptions;
        return Promise.resolve();
    },
    getNicsByTag: function() {},
    getVmsByTag: function() {}
};

restOperationMock = {
    setContentType: function() {},
    setBody: function(body) {
        bodySent = body;
    },
    getUri: function() {
        return {
            query: query
        };
    },
    fail: function(err) {
        errorSent = err;
    }
};

var reset = function() {
    bodySent = undefined;
    errorSent = undefined;
    expectedPath = undefined;
};

module.exports = {
    setUp: function(callback) {
        nodesWorker = new CloudNodesWorker();
        nodesWorker.logger = loggerMock;
        nodesWorker.provider = providerMock;
        nodesWorker.completeRestOperation = function() {};
        nodesWorker.onStart(function() {});
        reset();

        providerMock.getNicsByTag = function() {
            return Promise.resolve(
                [
                    {
                       id: '1',
                       ip: {
                           public: '1.2.3.4',
                           private: '5.6.7.8'
                       }
                   },
                   {
                       id: '2',
                       ip: {
                           public: '11.12.13.14',
                           private: '15.16.17.18'
                       }
                   }
                ]
            );
        };
        providerMock.getVmsByTag = function() {
            return Promise.resolve(
                [
                    {
                       id: '1',
                       ip: {
                           public: '21.22.23.24',
                           private: '25.26.27.28'
                       }
                   },
                   {
                       id: '2',
                       ip: {
                           public: '111.112.113.114',
                           private: '115.116.117.118'
                       }
                   }
                ]
            );
        };

        callback();
    },

    tearDown: function(callback) {
        Object.keys(require.cache).forEach(function(key) {
            delete require.cache[key];
        });
        callback();
    },

    testProviderOptions: function(test) {
        query = {
            cloud: 'aws',
            memberTag: 'foo=bar',
            memberAddressType: 'private',
            providerOptions: 'hello=world,okie=dokie,withEquals=one=two'
        };

        test.expect(3);
        nodesWorker.onGet(restOperationMock)
            .then(function() {
                test.strictEqual(providerOptionsSent.hello, "world");
                test.strictEqual(providerOptionsSent.okie, "dokie");
                test.strictEqual(providerOptionsSent.withEquals, "one=two");
                test.done();
            })
            .catch(function(err) {
                test.ok(false, err);
                test.done();
            });
    },

    testPrivateNics: function(test) {
        query = {
            cloud: 'aws',
            memberTag: 'foo=bar',
            memberAddressType: 'private'
        };

        test.expect(1);
        nodesWorker.onGet(restOperationMock)
            .then(function() {
                if (errorSent) {
                        test.ok(false, errorSent);
                }
                else {
                    test.deepEqual(
                        bodySent,
                        [
                            {
                                id: '1-private',
                                ip: '5.6.7.8'
                            },
                            {
                                id: '2-private',
                                ip: '15.16.17.18'
                            }
                        ]
                    );
                }
                test.done();
            })
            .catch(function(err) {
                test.ok(false, err);
                test.done();
            });
    },

    testPublicNics: function(test) {
        query = {
            cloud: 'aws',
            memberTag: 'foo=bar',
            memberAddressType: 'public'
        };

        test.expect(1);
        nodesWorker.onGet(restOperationMock)
            .then(function() {
                if (errorSent) {
                        test.ok(false, errorSent);
                }
                else {
                    test.deepEqual(
                        bodySent,
                        [
                            {
                                id: '1-public',
                                ip: '1.2.3.4'
                            },
                            {
                                id: '2-public',
                                ip: '11.12.13.14'
                            }
                        ]
                    );
                }
                test.done();
            })
            .catch(function(err) {
                test.ok(false, err);
                test.done();
            });
    },

    testNoNics: function(test) {
        providerMock.getNicsByTag = function() {
            return Promise.resolve([]);
        };

        query = {
            cloud: 'aws',
            memberTag: 'foo=bar',
            memberAddressType: 'private'
        };

        test.expect(1);
        nodesWorker.onGet(restOperationMock)
            .then(function() {
                if (errorSent) {
                        test.ok(false, errorSent);
                }
                else {
                    test.deepEqual(
                        bodySent,
                        [
                            {
                                id: '1-private',
                                ip: '25.26.27.28'
                            },
                            {
                                id: '2-private',
                                ip: '115.116.117.118'
                            }
                        ]
                    );
                }
                test.done();
            })
            .catch(function(err) {
                test.ok(false, err);
                test.done();
            });
    },

    testNoVms: function(test) {
        providerMock.getVmsByTag = function() {
            return Promise.resolve([]);
        };

        query = {
            cloud: 'aws',
            memberTag: 'foo=bar',
            memberAddressType: 'private'
        };

        test.expect(1);
        nodesWorker.onGet(restOperationMock)
            .then(function() {
                if (errorSent) {
                        test.ok(false, errorSent);
                }
                else {
                    test.deepEqual(
                        bodySent,
                        [
                            {
                                id: '1-private',
                                ip: '5.6.7.8'
                            },
                            {
                                id: '2-private',
                                ip: '15.16.17.18'
                            }
                        ]
                    );
                }
                test.done();
            })
            .catch(function(err) {
                test.ok(false, err);
                test.done();
            });
    },

    testNoNicsNoVms: function(test) {
        providerMock.getNicsByTag = function() {
            return Promise.resolve();
        };

        providerMock.getVmsByTag = function() {
            return Promise.resolve();
        };

        nodesWorker.onGet(restOperationMock)
            .then(function() {
                test.deepEqual(bodySent, []);
                test.done();
            })
            .catch(function(err) {
                test.ok(false, err);
                test.done();
            });
    }
};