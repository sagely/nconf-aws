/* jshint node: true */
/* global describe, it, expect, beforeEach, afterEach, runs, waitsFor */
'use strict';

var nconf = require('nconf'),
    sinon = require('sinon'),
    proxyquire = require('proxyquire'),
    AWS = require('node-aws-mock');

var nconf_aws = proxyquire('../../lib/index', { 'aws-sdk': AWS });

//-----------------------------------------------------------------------------//
// Stub Setup
//-----------------------------------------------------------------------------//

AWS.MetadataService.addPath('/latest/dynamic/instance-identity/document', JSON.stringify({
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

AWS.EC2.addTag('i-fed232c9', 'instance', 'Name', 'Inferno (Development Server)');
AWS.EC2.addTag('i-fed232c9', 'instance', 'Test', 'This is a test');
AWS.EC2.addTag('i-fed232c9', 'instance', 'Another', 'This is another test');

AWS.S3.addBucket('config.goonies3.com');
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
var s3 = new AWS.S3();
s3.putObject({
  Bucket: 'config.goonies3.com',
  Key: 'development/config.json',
  Body: JSON.stringify(s3_json)
}, function() { });
s3.putObject({
  Bucket: 'config.goonies3.com',
  Key: 'development/config_invalid.json',
  Body: '{ InvalidJSON: Test }'
}, function() { });

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
