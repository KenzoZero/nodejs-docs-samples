/**
 * Copyright 2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const lightComputation = () => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return numbers.reduce((t, x) => t + x);
};

const heavyComputation = () => {
  // Multiplication is more computationally expensive than addition
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return numbers.reduce((t, x) => t * x);
};

const functionSpecificComputation = heavyComputation;
const fileWideComputation = lightComputation;

// [START functions_tips_scopes]
// Global (instance-wide) scope
// This computation runs at instance cold-start
const instanceVar = heavyComputation();

/**
 * Sample HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.scopeDemo = (req, res) => {
  // Per-function scope
  // This computation runs every time this function is called
  const functionVar = lightComputation();

  res.end(`Per instance: ${instanceVar}, per function: ${functionVar}`);
};
// [END functions_tips_scopes]

// [START functions_tips_lazy_globals]
// This value is always initialized, which happens at cold-start
const nonLazyGlobal = fileWideComputation();
let lazyGlobal;

/**
 * Sample HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.lazyGlobals = (req, res) => {
  // This value is initialized only if (and when) the function is called
  lazyGlobal = lazyGlobal || functionSpecificComputation();

  res.end(`Lazy global: ${lazyGlobal}, non-lazy global: ${nonLazyGlobal}`);
};
// [END functions_tips_lazy_globals]

// [START functions_tips_ephemeral_agent]
// [START functions_tips_cached_agent]
const http = require('http');
// [END functions_tips_ephemeral_agent]
const agent = new http.Agent({keepAlive: true});
// [END functions_tips_cached_connection]

// TODO(ace-n) make sure this import works as intended
// [START functions_tips_ephemeral_agent]
/**
 * HTTP Cloud Function that uses an ephemeral HTTP agent
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.ephemeralAgent = (req, res) => {
  req = http.request({
    host: '<HOST>',
    port: 80,
    path: '<PATH>',
    method: 'GET'
  }, resInner => {
    let rawData = '';
    resInner.setEncoding('utf8');
    resInner.on('data', chunk => { rawData += chunk; });
    resInner.on('end', () => {
      res.status(200).send(`Data: ${rawData}`);
    });
  });
  req.on('error', (e) => {
    res.status(500).send(`Error: ${e.message}`);
  });
  req.end();
};
// [END functions_tips_ephemeral_agent]

// [START functions_tips_cached_agent]
/**
 * HTTP Cloud Function that uses a cached HTTP agent
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.cachedAgent = (req, res) => {
  req = http.request({
    host: '',
    port: 80,
    path: '',
    method: 'GET',
    agent: agent
  }, resInner => {
    let rawData = '';
    resInner.setEncoding('utf8');
    resInner.on('data', chunk => { rawData += chunk; });
    resInner.on('end', () => {
      res.status(200).send(`Data: ${rawData}`);
    });
  });
  req.on('error', e => {
    res.status(500).send(`Error: ${e.message}`);
  });
  req.end();
};
// [END functions_tips_cached_agent]

// [START functions_tips_infinite_retries]
/**
 * Background Cloud Function that only executes within
 * a certain time period after the triggering event
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */
exports.avoidInfiniteRetries = (event, callback) => {
  const eventAge = Date.now() - Date.parse(event.timestamp);
  const eventMaxAge = 10000;

  // Ignore events that are too old
  if (eventAge > eventMaxAge) {
    console.log(`Dropping event ${event} with age ${eventAge} ms.`);
    callback();
    return;
  }

  // Do what the function is supposed to do
  console.log(`Processing event ${event} with age ${eventAge} ms.`);
};
// [END functions_tips_infinite_retries]

// [START functions_tips_retry_promise]
/**
 * Background Cloud Function that demonstrates
 * how to toggle retries using a callback
 *
 * @param {object} event The Cloud Functions event.
 */
exports.retryPromise = (event) => {
  const tryAgain = false;

  if (tryAgain) {
    throw new Error(`Retrying...`);
  } else {
    return Promise.reject(new Error('Not retrying...'));
  }
};
// [END functions_tips_retry_promise]

// [START functions_tips_retry_callback]
/**
 * Background Cloud Function that demonstrates
 * how to toggle retries using a promise
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */
exports.retryCallback = (event, callback) => {
  const tryAgain = false;
  const err = new Error('Error!');

  if (tryAgain) {
    console.error(`Retrying: ${err}`);
    callback(err);
  } else {
    console.error(`Not retrying: ${err}`);
    callback();
  }
};
// [END functions_tips_retry_callback]
