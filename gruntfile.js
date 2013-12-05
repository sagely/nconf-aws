'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: { 
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        globalstrict: true,
        node: true
      },
      pkg: {
        files: { src: [ 'lib/**/*.js' ] }
      },
      test: {
        options: {
          // jasmine globals
          globals: {
            jasmine    : false,
            isCommonJS : false,
            exports    : false,
            spyOn      : false,
            it         : false,
            xit        : false,
            expect     : false,
            runs       : false,
            waits      : false,
            waitsFor   : false,
            beforeEach : false,
            afterEach  : false,
            describe   : false,
            xdescribe  : false
          }
        },
        files: { src: [ 'test/unit/**/*.js' ] }
      }
    },

    jasmine_node: {
      unit: {
        specFolders: [ './test/unit/' ]
      }
    },

    clean: ["node_modules"]
  });


  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jasmine-node');


  grunt.registerTask('jasmine', ['jasmine_node']);
  grunt.registerTask('test',    ['jshint', 'jasmine']);

};
