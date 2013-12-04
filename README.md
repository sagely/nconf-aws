nconf-aws
=========

NConf plugin for AWS

## Installation

Since this is currently a private repository, the module requires authentication to be installed.

    $ npm install git+https://github.com/TeamPraxis/nconf-aws.git

## Configuration

This module uses the AWS SDK, so it is expected that the SDK is configured globally using the `AWS.config` object.

## Usage

There are three stores included with this module. The `awsinstance` store will load properties from the AWS dynamic metadata document (`/latest/dynamic/instance-identity/document`) with an optional `whitelist` parameter. You can also specify a `prefix` parameter that will prepend a prefix to properties as they are loaded into nconf.

``` js
  var nconf = require('nconf');
  require('nconf-aws');
  
  nconf.use('awsinstance', [ 'region' ]); // will only load the "region" property
```

The `awss3` store will load configuration data from the specified S3 object. The `bucket` and `key` parameters are required. The store supports the same formats as the built-in `file` store, and a custom format can be specified in the same manner.

``` js
  var nconf = require('nconf');
  require('nconf-aws');
  
  nconf.use('awss3', { bucket: 'mybucket', key: 'path/to/file.json' });
```
The `awsec2tag` store will load EC2 tags from the current EC2 instance. Like the `awsinstance` store it has optional `whitelist` and `prefix` parameters.

``` js
  var nconf  = require('nconf');
  require('nconf-aws')
    
  nconf.use('awsec2tag', { whitelist: [ 'Name' ], prefix: 'ec2_' });
```

Note that none of these stores loads synchronously, so you must call `nconf.load` with a callback in order to use them.

#### Author: [Keith Hamasaki](http://www.goonies3.com)
