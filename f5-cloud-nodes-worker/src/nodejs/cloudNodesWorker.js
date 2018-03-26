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

const logId = '[CloudNodesWorker]';

/**
 * A REST worker to query cloud providers for nodes based on query parameters
 * @constructor
 */
function CloudNodesWorker() {}

CloudNodesWorker.prototype.WORKER_URI_PATH = "shared/cloud/nodes";
CloudNodesWorker.prototype.isPublic = true;

CloudNodesWorker.prototype.onStart = function(callback) {
    this.logger.silly = this.logger.finest;
    this.logger.debug = this.logger.fine;
    this.logger.error = this.logger.severe;
    this.logger.warn = this.logger.warning;
    callback();
};

/**
 * Handles GET HTTP requests
 *
 * Looks for IPs by tag based on query parameters.
 *
 * Returns a response in the format
 *
 *    [
 *        {
 *            id: ID of owner
 *            ip: IP address of node
 *        }
 *    ]
 *
 * @param {Object} restOperation
 */
CloudNodesWorker.prototype.onGet = function(restOperation) {
    var query = restOperation.getUri().query;
    var Provider;
    var providerPath;
    var providerOptions;
    var pairs;

    this.logger.fine(logId, "onGet");

    if (!query.cloud) {
        restOperation.fail(new Error('cloud is a required parameter'));
        return;
    }
    if (!query.memberTag) {
        restOperation.fail(new Error('memberTag is a required parameter'));
        return;
    }
    if (!query.memberAddressType) {
        restOperation.fail(new Error('memberAddressType is a required parameter'));
        return;
    }

    this.logger.fine(logId, "using cloud", query.cloud);

    // this.provider can be set by test code, otherwise, get it from the known location
    if (!this.provider) {
        providerPath = '/config/cloud/' + query.cloud + '/node_modules/@f5devcentral/f5-cloud-libs-' + query.cloud;
        Provider = require(providerPath).provider;
        this.provider = new Provider(
            {
                clOptions: {user: 'admin'},
                logger: this.logger
            }
        );
    }

    this.logger.debug('Initializing cloud provider');
    providerOptions = {
        mgmtPort: query.mgmtPort || 443
    };

    if (query.providerOptions) {
        pairs = query.providerOptions.split(',');
        pairs.forEach(function(pair) {
            var keyValue = pair.split(/=(.+)/);
            if (keyValue.length > 1) {
                providerOptions[keyValue[0].trim()] = keyValue[1].trim();
            }
        });
    }

    return this.provider.init(providerOptions)
    .then(function() {
        this.logger.debug('Getting NICs');

        var key;
        var value;
        var keyValue = query.memberTag.split('=');
        var promises = [];

        if (keyValue.length > 1) {
            key = keyValue[0];
            value = keyValue[1];
        }
        else {
            value = keyValue[0];
        }

        this.logger.finest(logId, "key", key);
        this.logger.finest(logId, "value", value);

        promises.push(this.provider.getNicsByTag(
            {
                key: key,
                value: value
            }
        ));
        promises.push(this.provider.getVmsByTag(
            {
                key: key,
                value: value
            }
        ));

        return Promise.all(promises);
    }.bind(this))
    .then(function(responses) {
        var nics = responses[0] || [];
        var vms = responses[1] || [];
        var nodes;

        this.logger.finest('nics', JSON.stringify(nics));
        this.logger.finest('vms', JSON.stringify(vms));

        nodes = nics.reduce(function(result, nic) {
            var node = getNode(nic, query);
            if (node) {
                result.push(node);
            }
            return result;
        }, []);

        if (nodes.length === 0) {
            this.logger.debug('no valid nics found, trying vms');
            nodes = vms.reduce(function(result, vm) {
                var node = getNode(vm, query);
                if (node) {
                    result.push(node);
                }
                return result;
            }, []);
        }

        if (nodes.length === 0) {
            this.logger.debug('no valid pool nodes found');
        }

        restOperation.setContentType('application/json');
        restOperation.setBody(nodes);
        this.completeRestOperation(restOperation);
    }.bind(this))
    .catch(function(err) {
        this.logger.severe('Error while getting nodes', err);
        restOperation.fail(err);
    }.bind(this));
};

var getNode = function(owner, query) {
    var ip = query.memberAddressType.toLowerCase() === 'public' ? owner.ip.public : owner.ip.private;
    if (ip) {
        return {
            id: owner.id + '-' + query.memberAddressType.toLowerCase(),
            ip: ip
        };
    }
};

module.exports = CloudNodesWorker;