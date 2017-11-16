/* ============================================================
 * react-native-node.bittrex.api
 * https://github.com/dparlevliet/node.bittrex.api
 *
 * ============================================================
 * Copyright 2014 -, Adrian Soluch, David Parlevliet
 * Released under the MIT License
 * ============================================================ */
const hmac_sha512 = require('./hmac-sha512');
const http = require('react-native-http');

const NodeBittrexApi = (function () {
  const default_request_options = {
    method: 'GET',
    agent: false,
    headers: {
      'User-Agent': 'Mozilla/4.0 (compatible; Node Bittrex API)',
      'Content-type': 'application/x-www-form-urlencoded'
    }
  };

  const opts = {
    baseUrl: 'https://bittrex.com/api/v1.1',
    baseUrlv2: 'https://bittrex.com/Api/v2.0',
    websockets_baseurl: 'wss://socket.bittrex.com/signalr',
    websockets_hubs: ['CoreHub'],
    apikey: 'API_KEY',
    apisecret: 'API_SECRET_KEY',
    verbose: false,
    cleartext: false,
    inverse_callback_arguments: true,
    websockets: {
      autoReconnect: true,
    },
    requestTimeoutInSeconds: 15,
  };

  let lastNonces = [];

  const getNonce = function () {
    const nonce = new Date().getTime();
    if (lastNonces.indexOf(nonce) > -1) {
      // we already used this nonce so keep trying to get a new one.
      return getNonce();
    }
    // keep the last X to try ensure we don't have collisions even if the clock is adjusted
    lastNonces = lastNonces.slice(-50);
    lastNonces.push(nonce);
    return nonce;
  };

  const extractOptions = function (options) {
    const o = Object.keys(options);
    for (let i = 0; i < o.length; i++) {
      opts[o[i]] = options[o[i]];
    }
  };

  const updateQueryStringParameter = function (uri, key, value) {
    const re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
    const separator = uri.indexOf('?') !== -1 ? '&' : '?';
    if (uri.match(re)) {
      uri = uri.replace(re, '$1' + key + '=' + value + '$2');
    } else {
      uri = uri + separator + key + '=' + value;
    }

    return uri;
  };

  const setRequestUriGetParams = function (uri, options) {
    let op;
    if (typeof (uri) === 'object') {
      op = uri;
      uri = op.uri;
    } else {
      op = Object.assign({}, default_request_options);
    }
    const o = Object.keys(options);
    for (let i = 0; i < o.length; i++) {
      uri = updateQueryStringParameter(uri, o[i], options[o[i]]);
    }
    op.headers.apisign = hmac_sha512.HmacSHA512(uri, opts.apisecret); // setting the HMAC hash `apisign` http header
    op.uri = uri;
    op.path = uri;
    op.timeout = opts.requestTimeoutInSeconds * 1000;

    return op;
  };

  const apiCredentials = function (uri) {
    const options = {
      apikey: opts.apikey,
      nonce: getNonce()
    };
    return setRequestUriGetParams(uri, options);
  };

  const sendRequestCallback = function (callback, op) {
    // const start = Date.now();
    op.skipAuthorization = true;
    const httpModule = new http.HTTPService();
    httpModule.get(op.path, null, op).then((response) => {
      callback(null, response);
    }).catch((err) => {
      console.error('error while making a get request', err);
    });
  };

  const publicApiCall = function (url, callback, options) {
    const op = Object.assign({}, default_request_options);
    if (!options) {
      op.path = url;
    }
    sendRequestCallback(callback, (!options) ? op : setRequestUriGetParams(url, options));
  };

  const credentialApiCall = function (url, callback, options) {
    if (options) {
      options = setRequestUriGetParams(apiCredentials(url), options);
    }
    sendRequestCallback(callback, options);
  };

  return {
    options(options) {
      extractOptions(options);
    },
    sendCustomRequest(request_string, callback, credentials) {
      let op;
      if (credentials === true) {
        op = apiCredentials(request_string);
      } else {
        op = Object.assign({}, default_request_options, {
          uri: request_string
        });
      }
      sendRequestCallback(callback, op);
    },
    getmarkets(callback) {
      publicApiCall(opts.baseUrl + '/public/getmarkets', callback, null);
    },
    getcurrencies(callback) {
      publicApiCall(opts.baseUrl + '/public/getcurrencies', callback, null);
    },
    getticker(options, callback) {
      publicApiCall(opts.baseUrl + '/public/getticker', callback, options);
    },
    getmarketsummaries(callback) {
      publicApiCall(opts.baseUrl + '/public/getmarketsummaries', callback, null);
    },
    getmarketsummary(options, callback) {
      publicApiCall(opts.baseUrl + '/public/getmarketsummary', callback, options);
    },
    getorderbook(options, callback) {
      publicApiCall(opts.baseUrl + '/public/getorderbook', callback, options);
    },
    getmarkethistory(options, callback) {
      publicApiCall(opts.baseUrl + '/public/getmarkethistory', callback, options);
    },
    getcandles(options, callback) {
      publicApiCall(opts.baseUrlv2 + '/pub/market/GetTicks', callback, options);
    },
    buylimit(options, callback) {
      credentialApiCall(opts.baseUrl + '/market/buylimit', callback, options);
    },
    buymarket(options, callback) {
      credentialApiCall(opts.baseUrl + '/market/buymarket', callback, options);
    },
    selllimit(options, callback) {
      credentialApiCall(opts.baseUrl + '/market/selllimit', callback, options);
    },
    tradesell(options, callback) {
      credentialApiCall(opts.baseUrlv2 + '/key/market/TradeSell', callback, options);
    },
    tradebuy(options, callback) {
      credentialApiCall(opts.baseUrlv2 + '/key/market/TradeBuy', callback, options);
    },
    sellmarket(options, callback) {
      credentialApiCall(opts.baseUrl + '/market/sellmarket', callback, options);
    },
    cancel(options, callback) {
      credentialApiCall(opts.baseUrl + '/market/cancel', callback, options);
    },
    getopenorders(options, callback) {
      credentialApiCall(opts.baseUrl + '/market/getopenorders', callback, options);
    },
    getbalances(callback) {
      credentialApiCall(opts.baseUrl + '/account/getbalances', callback, {});
    },
    getbalance(options, callback) {
      credentialApiCall(opts.baseUrl + '/account/getbalance', callback, options);
    },
    getwithdrawalhistory(options, callback) {
      credentialApiCall(opts.baseUrl + '/account/getwithdrawalhistory', callback, options);
    },
    getdepositaddress(options, callback) {
      credentialApiCall(opts.baseUrl + '/account/getdepositaddress', callback, options);
    },
    getdeposithistory(options, callback) {
      credentialApiCall(opts.baseUrl + '/account/getdeposithistory', callback, options);
    },
    getorderhistory(options, callback) {
      credentialApiCall(opts.baseUrl + '/account/getorderhistory', callback, options || {});
    },
    getorder(options, callback) {
      credentialApiCall(opts.baseUrl + '/account/getorder', callback, options);
    },
    withdraw(options, callback) {
      credentialApiCall(opts.baseUrl + '/account/withdraw', callback, options);
    }
  };
}());

module.exports = NodeBittrexApi;
