var easyimg = require('easyimage');
var async = require('async');
var format = require('sprintf-js').sprintf;
var Q = require('q');
var fs = require('fs');
var path = require('path');

var outputTempFilePath = null
  , outputFilePath = null
  , tempDir = null
  , outputDir = null
  , filename = null

module.exports = function(options) {
  tempDir = path.join(process.cwd(), options.tempDir)

  outputDir = options.outputDir
  filename = options.filename

  outputTempFilePath = path.join(process.cwd(), tempDir)
  outputFilePath = path.join(process.cwd(), outputDir)

  return execute
};

var execute = function execute(imagePath, uniqueId, sizesArray) {
  var defer = Q.defer();
  getDimensions(imagePath).then(function success(dimensions) {
    var sortedSizes = sizesArray.sort(function(a, b){return b-a;});

    if (dimensions.width > sortedSizes[0] && dimensions.height > sortedSizes[0]) {
      if (dimensions.width !== dimensions.height) {
        squareUp(imagePath, sortedSizes[0], dimensions.width, dimensions.height).then(function success(response) {
          processImages(imagePath, uniqueId, sortedSizes).then(function success(paths) {
            defer.resolve(paths);
          }, function error(err) {
            defer.reject(err);
          });
        }, function error(err) {
          defer.reject('squaring image failed');
        });
      } else {
        processImages(imagePath, uniqueId, sortedSizes).then(function success(paths) {
          defer.resolve(paths);
        }, function error(err) {
          defer.reject(err);
        });
      }
    } else {
      defer.reject("Image is too small to process. Image must be larger than the biggest size in sizesArray");
    }
  }, function error(err) {
    defer.reject(err);
  });

  return defer.promise;
};

function getDimensions(path) {
  return easyimg.info(path).then(
    function(file) {
      return { width: file.width, height: file.height };
    }, function (err) {
      return err;
    }
  );
}

function processImages(path, uniqueId, sizesArray) {
  var defer = Q.defer();
  var paths = [];

  var resizeAndCircularize = function(size) {
    var defer = Q.defer();

    async.series([
      function(callback) {
        resize(path, uniqueId, size).then(function success(response){
          callback(null, response);
        }, function error(err) {
          callback(err, null);
        });
      },
      function(callback) {
        circularize(path, uniqueId, size).then(function success(response){
          callback(null, response);
        }, function error(err) {
          callback(err, null);
        });
      }
    ], function(err, results) {
      if (err) {
        console.log(err);
        defer.reject(err);
      } else {
        console.log(results);
        paths.push(results[1]);
        defer.resolve();
      }
    });

    return defer.promise;
  };

  async.each(sizesArray, function(size, callback) {
    console.log('processing image size: ' + size);
    resizeAndCircularize(size).then(function success () {
      callback();
    }, function error (err) {
      callback(err);
    });
  }, function (err) {
    if (err) defer.reject(err);
    defer.resolve(paths);
  });

  return defer.promise;
}

function squareUp(path, size, originalWidth, originalHeight) {
  console.log('square up image');
  return easyimg.crop({
    src: path,
    width: size,
    height: size,
    x: originalWidth/2,
    y: originalHeight/2
  }).then(function success (path) {
    return path;
  }, function error (err) {
    return err;
  });
};

function resize(path, uniqueId, size) {
  var tempPath = format(outputTempFilePath, uniqueId, size);

  return easyimg.exec('convert ' + path + ' -resize ' +
    (size) + 'x' + (size) + '^  -gravity center -crop ' +
    (size + 2) + 'x' + (size + 2) + '+0+0 +repage ' + `${tempDir}/${filename}`).then(function success () {
      return tempPath;
    }, function error (err) {
      return err;
    });
};

function circularize(path, uniqueId, size) {
  console.log('circularizing: ', size);
  var radius = (size/2) - 1;
  var circleSize = format('%1$d,%1$d %1$d 0', radius);
  var tempPath = format(path, uniqueId, size);
  var finalPath = format(`${outputFilePath}/${path}`, uniqueId, size);

  return easyimg.exec('convert ' + tempPath + ' \\( -gravity center -size ' + (size) + 'x' + (size) +
  ' xc:none -fill white -draw \'circle ' + circleSize + '\' \\) ' +
  '-compose copy_opacity -composite ' + path).then(function success () {
    return finalPath;
  }, function error (err) {
    return err;
  });
};
