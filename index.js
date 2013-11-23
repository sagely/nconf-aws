/*
 * NConf storage engine that retrieves data from AWS.
 *
 * Two storage engines are provided:
 *  - awsinstance: loads from the dynamic AWS instance metadata.
 *  - awss3: loads from a specified AWS S3 object.
 */
var nconf = require('nconf'),
  util = require('util'),
  async = require('async'),
  AWS = require('aws-sdk');

var Memory = nconf.Memory;

//-------------------------------------------------------------------------------------//
// AWSInstance store - read data from the dynamic AWS Instance metadata.
//-------------------------------------------------------------------------------------//

/**
 * Store that reads data from the dynamic AWS Instance metadata.
 **/
var AWSInstance = exports.AWSInstance = function(options) {
  Memory.call(this, options);
  options = options || {};
  this.type = 'awsinstance';
  this.readOnly = false;
  this.whitelist = options.whitelist || [];
  if (options instanceof Array) {
    this.whitelist = options;
  }
};

// Inherit from the Memory store
util.inherits(AWSInstance, Memory);

// set this on nconf so it knows how to find us
nconf.Awsinstance = AWSInstance;

/**
 * Load the AWS instance data into the store.
 **/
AWSInstance.prototype.load = function(callback) {
  var self = this;

  var meta = new AWS.MetadataService();
  meta.request('/latest/dynamic/instance-identity/document',
    function(err, body) {
      // ignore errors and only load it if it's available
      if (body) {
        var data = JSON.parse(body);
        Object.keys(data).filter(function (key) {
          return !self.whitelist.length || self.whitelist.indexOf(key) !== -1;
        }).forEach(function (key) {
          self.set(key, data[key]);
        });
      }

      callback(null, self.store);
    });
};

/**
 * Delete loadSync so nconf.load doesn't try to use it.
 **/
AWSInstance.prototype.loadSync = null;

//-------------------------------------------------------------------------------------//
// AWSInstance store - read data from the specified S3 object.
//-------------------------------------------------------------------------------------//

/**
 * Store that reads data from an AWS S3 object.
 **/
var AWSS3 = exports.AWSS3 = function(options) {
  if (!options || !options.bucket) {
    throw new Error ('Missing required option `bucket`');
  }

  if (!options || !options.key) {
    throw new Error ('Missing required option `key`');
  }

  Memory.call(this, options);
  this.type = 'awss3';
  this.readOnly = false;
  this.bucket = options.bucket;
  this.key = options.key;
  this.format = options.format || nconf.formats.json;
};

// Inherit from the Memory store
util.inherits(AWSS3, Memory);

// set this on nconf so it knows how to find us
nconf.Awss3 = AWSS3;

/**
 * Load the data from the AWS bucket into the store.
 **/
AWSS3.prototype.load = function(callback) {
  var self = this;

  async.waterfall([
    // use meta to retrieve the region
    function(callback) {
      var meta = new AWS.MetadataService();
      meta.request('/latest/dynamic/instance-identity/document', callback);
    },
    // try to load from S3
    function(body, callback) {
      var data = JSON.parse(body);
      var s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        region: nconf.get('region') || data.region
      });

      s3.getObject({ Bucket: self.bucket, Key: self.key }, callback);
    }
  ], function(err, s3data) {
    // ignore errors and only load it if it's available
    if (!err && s3data) {
      self.store = self.format.parse(s3data.Body.toString());
    }
    callback(null, self.store);
  });
};

/**
 * Delete loadSync so nconf.load doesn't try to use it.
 **/
AWSS3.prototype.loadSync = null;
