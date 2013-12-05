/* jshint node: true */
/* global describe, it, expect, beforeEach, afterEach, runs, waitsFor */
'use strict';

var nconf = require('nconf'),
    nconf_aws = require('../../lib/index'),
    sinon = require('sinon'),
    AWS = require('aws-sdk');

//-----------------------------------------------------------------------------//
// Stub Setup
//-----------------------------------------------------------------------------//

/**
 * Set up a sinon stub for the AWS Metadata service.
 **/
var meta = new AWS.MetadataService();
sinon.stub(AWS, 'MetadataService', function() {
  return {
    request: function(path, callback) {
      if (path === '/latest/dynamic/instance-identity/document') {
        // return a sample set of metadata
        callback(null, JSON.stringify({
          "instanceId" : "i-fed232c9",
          "billingProducts" : null,
          "accountId" : "788731124032",
          "imageId" : "ami-ec53c8dc",
          "kernelId" : "aki-fc37bacc",
          "ramdiskId" : null,
          "architecture" : "x86_64",
          "instanceType" : "m1.medium",
          "pendingTime" : "2013-11-20T01:21:27Z",
          "region" : "us-west-2",
          "version" : "2010-08-31",
          "devpayProductCodes" : null,
          "privateIp" : "172.31.27.149",
          "availabilityZone" : "us-west-2b"     
        }));
      } else {
        callback('Not found');
      }
    },
    loadCredentials: meta.loadCredentials
  };
});

/**
 * Set up a sinon stub for the AWS S3 service.
 **/
sinon.stub(AWS, 'S3', function(options) {
  return {
    getObject: function(options, callback) {
      if (options.Bucket === 'config.goonies3.com' && options.Key === 'development/config.json') {
        // test S3 json object
        var s3_json = {
          "port": "3000",
          "log_folder": "logs",
          "log_level": "info",
          "loggly": {
            "level": "info",
            "json": true,
            "subdomain": "goonies3",
            "inputToken": "my-token"
          }
        };

        callback(null, { Body: JSON.stringify(s3_json) });
      } else if (options.Bucket === 'config.goonies3.com' && options.Key === 'development/config_invalid.json') {
        callback(null, { Body: '{ InvalidJSON: Test }' });
      } else {
        callback('404', null);
        return;
      }
    }
  };
});

/**
 * Set up a sinon stub for the AWS EC2 service.
 **/
sinon.stub(AWS, 'EC2', function(options) {
  return {
    describeTags: function(options, callback) {
      // make sure the instanceId is correct
      var id_opts = options.Filters ? options.Filters.filter(function(val) {
        return val.Name === 'resource-id';
      }) : [];
      if (id_opts.length > 0 && id_opts[0].Values[0] === 'i-fed232c9') {
        callback(null, {
          Tags: [
            { ResourceId: 'i-fed232c9',
              ResourceType: 'instance',
              Key: 'Name',
              Value: 'Inferno (Development Server)'
            },
            { ResourceId: 'i-fed232c9',
              ResourceType: 'instance',
              Key: 'Test',
              Value: 'This is a test'
            },
            { ResourceId: 'i-fed232c9',
              ResourceType: 'instance',
              Key: 'Another',
              Value: 'This is another test'
            }
          ],
          requestId: '0c164999-4526-4e88-80db-1493982b3fae'
        });
      } else {
        callback('Invalid instance ID');
      }
    }
  };
});

//-----------------------------------------------------------------------------//
// Test Specs
//-----------------------------------------------------------------------------//

var loaded = false;

/**
 * Test the awsinstance store.
 **/
describe('Testing the awsinstance store', function(){

  beforeEach(function() {
    loaded = false;
  });

  afterEach(function() {
    nconf.remove('awsinstance');
  });

  it('should load all instance metadata properties.', function() {
    runs(function() {
      nconf.add('awsinstance');
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('instanceId')).toEqual('i-fed232c9');
      expect(nconf.get('billingProducts')).toBeNull();
      expect(nconf.get('accountId')).toEqual('788731124032');
      expect(nconf.get('imageId')).toEqual('ami-ec53c8dc');
      expect(nconf.get('kernelId')).toEqual('aki-fc37bacc');
      expect(nconf.get('ramdiskId')).toBeNull();
      expect(nconf.get('architecture')).toEqual('x86_64');
      expect(nconf.get('instanceType')).toEqual('m1.medium');
      expect(nconf.get('pendingTime')).toEqual('2013-11-20T01:21:27Z');
      expect(nconf.get('region')).toEqual('us-west-2');
      expect(nconf.get('version')).toEqual('2010-08-31');
      expect(nconf.get('devpayProductCodes')).toBeNull();
      expect(nconf.get('privateIp')).toEqual('172.31.27.149');
      expect(nconf.get('availabilityZone')).toEqual('us-west-2b');
    });
  });

  it('should load only two metadata properties on the whitelist.', function() {
    runs(function() {
      nconf.add('awsinstance', [ 'region', 'instanceId' ]);
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('instanceId')).toEqual('i-fed232c9');
      expect(nconf.get('region')).toEqual('us-west-2');

      expect(nconf.get('billingProducts')).toBeUndefined();
      expect(nconf.get('accountId')).toBeUndefined();
      expect(nconf.get('imageId')).toBeUndefined();
      expect(nconf.get('kernelId')).toBeUndefined();
      expect(nconf.get('ramdiskId')).toBeUndefined();
      expect(nconf.get('architecture')).toBeUndefined();
      expect(nconf.get('instanceType')).toBeUndefined();
      expect(nconf.get('pendingTime')).toBeUndefined();
      expect(nconf.get('version')).toBeUndefined();
      expect(nconf.get('devpayProductCodes')).toBeUndefined();
      expect(nconf.get('privateIp')).toBeUndefined();
      expect(nconf.get('availabilityZone')).toBeUndefined();
    });
  });

  it('should load only whitelisted properties using a full options object.', function() {
    runs(function() {
      nconf.add('awsinstance', { whitelist: [ 'privateIp', 'version' ] });
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('version')).toEqual('2010-08-31');
      expect(nconf.get('privateIp')).toEqual('172.31.27.149');

      expect(nconf.get('instanceId')).toBeUndefined();
      expect(nconf.get('billingProducts')).toBeUndefined();
      expect(nconf.get('accountId')).toBeUndefined();
      expect(nconf.get('imageId')).toBeUndefined();
      expect(nconf.get('kernelId')).toBeUndefined();
      expect(nconf.get('ramdiskId')).toBeUndefined();
      expect(nconf.get('architecture')).toBeUndefined();
      expect(nconf.get('instanceType')).toBeUndefined();
      expect(nconf.get('pendingTime')).toBeUndefined();
      expect(nconf.get('region')).toBeUndefined();
      expect(nconf.get('devpayProductCodes')).toBeUndefined();
      expect(nconf.get('availabilityZone')).toBeUndefined();
    });
  });

  it('should use the supplied prefix.', function() {
    runs(function() {
      nconf.add('awsinstance', { whitelist: [ 'imageId', 'devpayProductCodes' ], prefix: 'aws_' });
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('aws_imageId')).toEqual('ami-ec53c8dc');
      expect(nconf.get('aws_devpayProductCodes')).toBeNull();

      expect(nconf.get('imageId')).toBeUndefined();
      expect(nconf.get('devpayProductCodes')).toBeUndefined();
    });
  });
});

/**
 * Test the awss3 store.
 **/
describe('Testing the awss3 store', function(){

  beforeEach(function() {
    loaded = false;
  });

  afterEach(function() {
    nconf.remove('awss3');
  });

  it('should load the S3 object.', function() {
    runs(function() {
      nconf.add('awss3', { bucket: 'config.goonies3.com', key: 'development/config.json' });
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('port')).toEqual('3000');
      expect(nconf.get('log_folder')).toEqual('logs');
      expect(nconf.get('log_level')).toEqual('info');
      expect(nconf.get('loggly').level).toEqual('info');
      expect(nconf.get('loggly').json);
      expect(nconf.get('loggly').subdomain).toEqual('goonies3');
      expect(nconf.get('loggly').inputToken).toEqual('my-token');
    });
  });

  it('should silently ignore an S3 object that isn\'t found.', function() {
    runs(function() {
      nconf.add('awss3', { bucket: 'config.goonies3.com', key: 'development/config2.json' });
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('port')).toBeUndefined();
      expect(nconf.get('log_folder')).toBeUndefined();
      expect(nconf.get('log_level')).toBeUndefined();
      expect(nconf.get('loggly')).toBeUndefined();
    });
  });

  it('should throw an exception on a parse error.', function() {
    runs(function() {
      nconf.add('awss3', { bucket: 'config.goonies3.com', key: 'development/config_invalid.json' });
      nconf.load(function(err) {
        expect(err).toBeTruthy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('port')).toBeUndefined();
      expect(nconf.get('log_folder')).toBeUndefined();
      expect(nconf.get('log_level')).toBeUndefined();
      expect(nconf.get('loggly')).toBeUndefined();
    });
  });
});

/**
 * Test the awsec2tag store.
 **/
describe('Testing the awsec2tag store', function(){

  beforeEach(function() {
    loaded = false;
  });

  afterEach(function() {
    nconf.remove('awsec2tag');
  });

  it('should load all of the EC2 tags.', function() {
    runs(function() {
      nconf.add('awsec2tag');
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('Name')).toEqual('Inferno (Development Server)');
      expect(nconf.get('Test')).toEqual('This is a test');
      expect(nconf.get('Another')).toEqual('This is another test');
    });
  });

  it('should load only two metadata properties on the whitelist.', function() {
    runs(function() {
      nconf.add('awsec2tag', [ 'Name', 'Test', 'Test2' ]);
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('Name')).toEqual('Inferno (Development Server)');
      expect(nconf.get('Test')).toEqual('This is a test');
      expect(nconf.get('Another')).toBeUndefined();
      expect(nconf.get('Test2')).toBeUndefined();
    });
  });

  it('should load only whitelisted properties using a full options object.', function() {
    runs(function() {
      nconf.add('awsec2tag', { whitelist: [ 'Another' ] });
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('Another')).toEqual('This is another test');
      expect(nconf.get('Name')).toBeUndefined();
      expect(nconf.get('Test')).toBeUndefined();
    });
  });

  it('should use the supplied prefix.', function() {
    runs(function() {
      nconf.add('awsec2tag', { prefix: 'ec2_' });
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get('ec2_Name')).toEqual('Inferno (Development Server)');
      expect(nconf.get('ec2_Test')).toEqual('This is a test');
      expect(nconf.get('ec2_Another')).toEqual('This is another test');

      expect(nconf.get('Name')).toBeUndefined();
      expect(nconf.get('Test')).toBeUndefined();
      expect(nconf.get('Another')).toBeUndefined();
    });
  });
});
