/*
 * NConf storage engine that retrieves data from AWS.
 *
 * Three storage engines are provided:
 *  - awsinstance: loads from the dynamic AWS instance metadata.
 *  - awss3: loads from a specified AWS S3 object.
 *  - awsec2tag: loads from AWS EC2 tags for the current instance.
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
  this.prefix = options.prefix || '';
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
          self.set(self.prefix + key, data[key]);
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
// AWSS3 store - read data from the specified S3 object.
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
    // use meta to retrieve the region if not already set
    function(callback) {
      if (!AWS.config.region && !nconf.get('region')) {
        var meta = new AWS.MetadataService();
        meta.request('/latest/dynamic/instance-identity/document', callback);
      } else {
        callback(null, null);
      }
    },
    // try to load from S3
    function(body, callback) {
      var data = {};
      if (body) {
        data = JSON.parse(body);
      }
      var s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        region: AWS.config.region || nconf.get('region') || data.region
      });

      s3.getObject({ Bucket: self.bucket, Key: self.key }, callback);
    }
  ], function(err, s3data) {
    // ignore errors and only load it if it's available
    if (!err && s3data) {
      try {
        self.store = self.format.parse(s3data.Body.toString());
      } catch (ex) {
        callback(new Error("Error parsing configuration file: [" + self.bucket + ': ' + self.key + '].'));
        return;
      }
    }
    callback(null, self.store);
  });
};

/**
 * Delete loadSync so nconf.load doesn't try to use it.
 **/
AWSS3.prototype.loadSync = null;

//-------------------------------------------------------------------------------------//
// AWSEC2Tag store - read data from the specified EC2 tags.
//-------------------------------------------------------------------------------------//

/**
 * Store that reads data from AWS EC2 tags on the current instance.
 **/
var AWSEC2Tag = exports.AWSEC2Tag = function(options) {
  Memory.call(this, options);
  options = options || {};
  this.type = 'awsec2tag';
  this.readOnly = false;
  this.whitelist = options.whitelist || [];
  this.prefix = options.prefix || '';
  if (options instanceof Array) {
    this.whitelist = options;
  }
};

// Inherit from the Memory store
util.inherits(AWSEC2Tag, Memory);

// set this on nconf so it knows how to find us
nconf.Awsec2tag = AWSEC2Tag;

/**
 * Load the data from the AWS EC2 tags into the store.
 **/
AWSEC2Tag.prototype.load = function(callback) {
  var self = this;

  async.waterfall([
    // use meta to retrieve the region and instance ID
    function(callback) {
      var meta = new AWS.MetadataService();
      meta.request('/latest/dynamic/instance-identity/document', callback);
    },
    // try to load from the tag service
    function(body, callback) {
      var data = {};
      if (body) {
        data = JSON.parse(body);
      }
      var ec2 = new AWS.EC2({
        apiVersion: '2013-10-01',
        region: data.region
      });

      ec2.describeTags({
        Filters: [
          { Name: "resource-id", Values: [ data.instanceId ] },
          { Name: "resource-type", Values: [ "instance" ] }
        ]
      }, callback);
    }
  ], function(err, data) {
    // ignore errors and only load it if it's available
    if (!err && data) {
      data.Tags.filter(function(tag) {
        return !self.whitelist.length || self.whitelist.indexOf(tag.Key) !== -1;
      }).forEach(function (tag) {
        self.set(self.prefix + tag.Key, tag.Value);
      });
    }
    callback(null, self.store);
  });
};

/**
 * Delete loadSync so nconf.load doesn't try to use it.
 **/
AWSEC2Tag.prototype.loadSync = null;

