/* global require, Buffer, module */
/* jshint esnext:true */
// through2 is a thin wrapper around node transform streams
var through = require('through2');
// var gutil = require('gulp-util');
// var PluginError = gutil.PluginError;
var fs = require('fs');
var Reference = require('./reference.js');
// Consts
const PLUGIN_NAME = 'gulp-ng-amd-compiler';
const MODULE_REGEXP = /angular\.amd\.module\([^\)]+\)/g;
const REF_REFEXP = /module\s([^\s]+)[^"]+"(app\.[^"]+)/g;
// Plugin level function(dealing with files)

function sort(modules) {
  this.sortedModules = [];
  this.sortedModulesKeys = [];

  for (var key in modules) {
    var unsortedModule = modules[key];

    var lastReferenceIndex = this.sortedModulesKeys.length - 1;

    for (var i = this.sortedModulesKeys.length - 1; i >= 0; i--) {
      // var sortedKey = this.sortedModulesKeys[i],
      var sortedModule = this.sortedModules[i],
        isReference = hasDependency(key, sortedModule.dependencies);

      if (isReference) {
        lastReferenceIndex = i;
      }
    }

    this.sortedModulesKeys.splice(lastReferenceIndex, 0, key);
    this.sortedModules.splice(lastReferenceIndex, 0, unsortedModule);
  }

  return this.sortedModules;
}


function getReferences(fileContent) {
  'use strict';
  var moduleDefinitions, moduleReference, references = [];
  while (moduleDefinitions = MODULE_REGEXP.exec(fileContent)) {
    if (moduleDefinitions) {
      while (moduleReference = REF_REFEXP.exec(moduleDefinitions)) {

        if (moduleReference) {
          var refModule = new Reference(moduleReference[1], moduleReference[2].replace(/\./g, '/'));
          references.push(refModule);
        }
      }
    }
  }
  return references;
}

function handleReferences(modules, references) {
  for (var i = 0; i < references.length; i++) {
    var currentReferencedModule = references[i];
    if (modules[currentReferencedModule.name]) {
      continue;
    }
    var refContent = fs.readFileSync('src/' + currentReferencedModule.file + '.js');

    var refsReferences = getReferences(refContent);

    for (var module in modules) {
      modules[currentReferencedModule.name] = {
        content: refContent,
        dependencies: refsReferences
      };
    }

    handleReferences(modules, refsReferences);
  }
}

function hasDependency(moduleName, dependencies) {
  for (var i = 0; i < dependencies.length; i++) {
    if (moduleName === dependencies[i].name) {
      return true;
    }
  }
  return false;
}

function gulpNgAMDCompiler() {

  // Creating a stream through which each file will pass
  var stream = through.obj(function(file, enc, callback) {

    var mainModuleFile = file.path.substring(file.path.indexOf('app/'), file.path.indexOf('.js'));
    var mainModuleName = mainModuleFile.replace(/\//, '.');

    var modules = {};
    var newContent = '';
    // if (file.isNull()) {
    //   // Do nothing if no contents
    // }
    if (file.isBuffer()) {
      var mainContent = String(file.contents);

      var references = getReferences(mainContent);

      modules[mainModuleName] = {
        content: mainContent,
        dependencies: references
      };
      handleReferences(modules, references);

      // var modulesList = Object.keys(modules);

      var sortedModulesArray = sort(modules);

      for (var i = 0; i < sortedModulesArray.length; i++) {
        newContent += sortedModulesArray[i].content;
      }


      file.contents = new Buffer(newContent);
    }

    if (file.isStream()) {
      return callback(new Error(PLUGIN_NAME + ": Streaming not supported"));
    }

    this.push(file);
    return callback();

  });

  // returning the file stream
  return stream;
}

// Exporting the plugin main function
module.exports = gulpNgAMDCompiler;