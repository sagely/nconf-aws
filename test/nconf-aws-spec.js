/* jshint node: true */
/* global describe, it, expect, beforeEach, afterEach, runs, waitsFor */
'use strict';

var nconf = require('nconf'),
    nconf_aws = require('../index'),
    sinon = require('sinon'),
    AWS = require('aws-sdk');

//-----------------------------------------------------------------------------//
// Stub Setup
//-----------------------------------------------------------------------------//

/**
 * Set up a sinon stub for the AWS Metadata Service.
 **/
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
    }
  };
});

//-----------------------------------------------------------------------------//
// Test Specs
//-----------------------------------------------------------------------------//

var loaded = false;
describe('Testing the awsinstance store', function(){

  beforeEach(function() {
    loaded = false;
  });

  afterEach(function() {
    nconf.remove('awsinstance');
  });

  it('should load all instance metadata properties', function() {
    runs(function() {
      nconf.add('awsinstance');
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get("instanceId")).toEqual("i-fed232c9");
      expect(nconf.get("billingProducts")).toBeNull();
      expect(nconf.get("accountId")).toEqual("788731124032");
      expect(nconf.get("imageId")).toEqual("ami-ec53c8dc");
      expect(nconf.get("kernelId")).toEqual("aki-fc37bacc");
      expect(nconf.get("ramdiskId")).toBeNull();
      expect(nconf.get("architecture")).toEqual("x86_64");
      expect(nconf.get("instanceType")).toEqual("m1.medium");
      expect(nconf.get("pendingTime")).toEqual("2013-11-20T01:21:27Z");
      expect(nconf.get("region")).toEqual("us-west-2");
      expect(nconf.get("version")).toEqual("2010-08-31");
      expect(nconf.get("devpayProductCodes")).toBeNull();
      expect(nconf.get("privateIp")).toEqual("172.31.27.149");
      expect(nconf.get("availabilityZone")).toEqual("us-west-2b");
    });
  });

  it('should load only two metadata properties on the whitelist', function() {
    runs(function() {
      nconf.add('awsinstance', [ 'region', 'instanceId' ]);
      nconf.load(function(err) {
        expect(err).toBeFalsy();
        loaded = true;
      });
    });

    waitsFor(function() { return loaded; });

    runs(function() {
      expect(nconf.get("instanceId")).toEqual("i-fed232c9");
      expect(nconf.get("region")).toEqual("us-west-2");

      expect(nconf.get("billingProducts")).toBeUndefined();
      expect(nconf.get("accountId")).toBeUndefined();
      expect(nconf.get("imageId")).toBeUndefined();
      expect(nconf.get("kernelId")).toBeUndefined();
      expect(nconf.get("ramdiskId")).toBeUndefined();
      expect(nconf.get("architecture")).toBeUndefined();
      expect(nconf.get("instanceType")).toBeUndefined();
      expect(nconf.get("pendingTime")).toBeUndefined();
      expect(nconf.get("version")).toBeUndefined();
      expect(nconf.get("devpayProductCodes")).toBeUndefined();
      expect(nconf.get("privateIp")).toBeUndefined();
      expect(nconf.get("availabilityZone")).toBeUndefined();
    });
  });
});
