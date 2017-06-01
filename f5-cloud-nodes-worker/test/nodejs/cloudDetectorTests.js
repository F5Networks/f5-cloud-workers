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
var CloudDetector = require('../../src/nodejs/cloudDetector');
var restOperationMock;
var cloudDetector;
var bodySent;
var expectedPath;

fsMock.access = function(path, mode, callback) {
    if (path === expectedPath) {
        callback();
    }
    else {
        callback(new Error());
    }
};

restOperationMock = {
    setBody: function(body) {
        bodySent = body;
    }
};

var reset = function() {
    bodySent = undefined;
    expectedPath = undefined;
};

module.exports = {
    setUp: function(callback) {
        cloudDetector = new CloudDetector();
        cloudDetector.completeRestOperation = function() {};
        reset();
        callback();
    },

    tearDown: function(callback) {
        Object.keys(require.cache).forEach(function(key) {
            delete require.cache[key];
        });
        callback();
    },

    testAws: function(test) {
        expectedPath = '/config/cloud/aws';
        cloudDetector.onGet(restOperationMock);
        test.strictEqual(bodySent.cloudProvider, 'aws');
        test.done();
    },

    testAzure: function(test) {
        expectedPath = '/config/cloud/node_modules';
        cloudDetector.onGet(restOperationMock);
        test.strictEqual(bodySent.cloudProvider, 'azure');
        test.done();
    },

    testUnknown: function(test) {
        expectedPath = '/foo';
        cloudDetector.onGet(restOperationMock);
        test.strictEqual(bodySent.cloudProvider, undefined);
        test.done();
    }
};