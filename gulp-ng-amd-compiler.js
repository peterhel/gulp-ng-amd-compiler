// through2 is a thin wrapper around node transform streams
var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var fs = require('fs');
var Reference = require('./reference.js');
// Consts
const PLUGIN_NAME = 'gulp-ng-amd-compiler';
const REF_REFEXP = /module\s([^\s]+)[^"]+"(app\.[^"]+)/g;
// Plugin level function(dealing with files)

function sort(modules){
  this.sortedModules = [];
  this.sortedModulesKeys = [];
  
  for(key in modules){
    var unsortedModule = modules[key];

    var lastReferenceIndex = this.sortedModulesKeys.length - 1;

    for (var i = this.sortedModulesKeys.length - 1; i >= 0; i--) {
      var sortedKey = this.sortedModulesKeys[i],
        sortedModule = this.sortedModules[i],
        //hasReference = hasDependency(sortedKey, unsortedModule.dependencies), 
        isReference = hasDependency(key, sortedModule.dependencies);

      if(isReference){
        console.log('module "%s" is dependent on "%s". moving on.', key, sortedKey);
        lastReferenceIndex = i;
      }
    }

    this.sortedModulesKeys.splice(lastReferenceIndex, 0, key);
    this.sortedModules.splice(lastReferenceIndex, 0, unsortedModule);
  }

  return this.sortedModules;
}


function getReferences(fileContent){
  'use strict';
  var match, references = [];

  while(match = REF_REFEXP.exec(fileContent))
  {

    if(match){
      var refModule = new Reference(match[1], match[2].replace(/\./g, '/'));
      references.push(refModule);
    }
  }
  return references;
}

function handleReferences(modules, references){
  for (var i = 0; i < references.length; i++) {
    var currentReferencedModule = references[i];
    if(modules[currentReferencedModule.name])
    {
      continue;
    }
    var refContent = fs.readFileSync('src/' + currentReferencedModule.file + '.js');

  console.log('References for "%s"', currentReferencedModule.name);

    var refsReferences = getReferences(refContent);

    for(module in modules){
      modules[currentReferencedModule.name] = { content: refContent, dependencies: refsReferences };
    }

    handleReferences(modules, refsReferences)
  }
}

function hasDependency(moduleName, dependencies){
  console.log('    Checking dependencies for module "%s"', moduleName);
  for (var i = 0; i < dependencies.length; i++) {
    if(moduleName == dependencies[i].name){
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
    console.log('References for "%s"', mainModuleName);

    var modules = { };
    var newContent = '';
    if (file.isNull()) {
       // Do nothing if no contents
    }
    if (file.isBuffer()) {
        var mainContent = String(file.contents);

        var references = getReferences(mainContent);

        modules[mainModuleName] = { content: mainContent, dependencies: references };
        handleReferences(modules, references);

        var modulesList = Object.keys(modules);

        var sortedModulesArray = sort(modules);
/*        try{
          var sorted = 1;

          while(sorted > 0)
          {
              sorted = 0;

                    modulesList = modulesList.sort(function(a, b){
                      if(modules[a].dependencies.length == 0){
                        return -1;
                      }
                      if(modules[b].dependencies.length == 0){
                        return 1;
                      }

                      var hasReference = hasDependency(b, modules[a].dependencies), 
                        isReference = hasDependency(a, modules[b].dependencies);

                      //console.log('Module %s deps: %s', a, JSON.stringify(modules[a].dependencies));
                      if(hasReference && isReference) {
                        throw new Error(PLUGIN_NAME + ': Circular dependencies found between "'+ a +'" and "'+b+'"');
                      }
                      if(isReference){
                        console.log('module "%s" is referenced in "%s". returns -1.', b, a);
                        sorted++;
                        return -1;
                      }
                      if(hasReference) {
                        console.log('module "%s" is dependent on "%s". returns 1.', a, b);
                        //sorted++;
                        return 1;
                      }
                      return 0;
                    });
          }
        }
        catch(e){
          return callback(e);    
        }*/
        for(var i = 0; i < sortedModulesArray.length; i++){
          newContent +=  sortedModulesArray[i].content;
        }


        file.contents = new Buffer(newContent);
    }

    if(file.isStream()){
      return callback(new Error(PLUGIN_NAME + ": Streaming not supported"));
    }

    this.push(file);
    return callback();

  });

  // returning the file stream
  return stream;
};

// Exporting the plugin main function
module.exports = gulpNgAMDCompiler;