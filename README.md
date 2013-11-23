nconf-aws
=========

NConf plugin for AWS

## Usage

There are two stores included with this module. The `awsinstance` store will load properties from the AWS dynamic metadata document (`/latest/dynamic/instance-identity/document`) with an optional whitelist parameter.

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

Note that neither of these stores loads synchronously, so for both you must call `nconf.load` with a callback in order to use them.

#### Author: [Keith Hamasaki](http://www.goonies3.com)
