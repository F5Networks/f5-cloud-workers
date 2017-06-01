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

const fs = require('fs');

const CLOUD_PROVIDERS = [
    {
        provider: 'aws',
        path: '/config/cloud/aws'
    },
    {
        provider: 'azure',
        path: '/config/cloud/node_modules'
    }
];

function CloudDetector() {
}

CloudDetector.prototype.WORKER_URI_PATH = 'shared/cloud/service-discovery/cloud-detector';
CloudDetector.prototype.isPublic = true;

CloudDetector.prototype.onGet = function(restOperation) {
    checkProvider.call(this, 0, restOperation);
};

var checkProvider = function(index, restOperation) {
    if (index < CLOUD_PROVIDERS.length) {
        fs.access(CLOUD_PROVIDERS[index].path, fs.F_OK, function(err) {
            if (err) {
                checkProvider.call(this, index + 1, restOperation);
            }
            else {
                completeRestOperation.call(this, restOperation, CLOUD_PROVIDERS[index].provider);
            }
        }.bind(this));
    }
    else {
        completeRestOperation.call(this, restOperation);
    }
};

var completeRestOperation = function(restOperation, provider) {
    restOperation.setBody({
        cloudProvider: provider
    });

    this.completeRestOperation(restOperation);
};

module.exports = CloudDetector;