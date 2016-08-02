var fs = require('fs');

var getMockList = require('./assets/get_mock_list');
var getRequestOpts = require('./assets/get_image_request_options');
var getImagePaths = require('./assets/get_image_paths');

// packages inside the image server docker
var request = require('request');
var test = require('tape');

// image formats to test
// N.B. 'png' is tested in `npm run test-image, no need to duplicate here
// TODO figure why 'jpeg' and 'webp' lead to errors
var FORMATS = ['svg', 'pdf', 'eps'];

// non-exhaustive list of mocks to test
var DEFAULT_LIST = ['0', 'geo_first', 'gl3d_z-range', 'text_export'];

// minimum satisfactory file size
var MIN_SIZE = 100;

/**
 *  Image export test script.
 *
 *  Called by `tasks/test_export.sh in `npm run test-export`.
 *
 *  CLI arguments:
 *
 *  1. 'pattern' : glob determining which mock(s) are to be tested
 *
 *  Examples:
 *
 *  Run the export test on the default mock list (in batch):
 *
 *      npm run test-image
 *
 *  Run the export on the 'contour_nolines' mock:
 *
 *      npm run test-image -- contour_nolines
 *
 *  Run the export test on all gl3d mocks (in batch):
 *
 *      npm run test-image -- gl3d_*
 */

var pattern = process.argv[2];
var mockList = pattern ? getMockList(pattern) : DEFAULT_LIST;

if(mockList.length === 0) {
    throw new Error('No mocks found with pattern ' + pattern);
}

// main
runInBatch(mockList);

function runInBatch(mockList) {
    test('testing image export formats', function(t) {
        t.plan(mockList.length * FORMATS.length);

        // send all requests out at once
        mockList.forEach(function(mockName) {
            FORMATS.forEach(function(format) {
                testExport(mockName, format, t);
            });
        });
    });
}

// The tests below determine whether the images are properly
// exported by (only) checking the file size of the generated images.
function testExport(mockName, format, t) {
    var requestOpts = getRequestOpts({ mockName: mockName, format: format }),
        imagePaths = getImagePaths(mockName, format),
        saveImageStream = fs.createWriteStream(imagePaths.test);

    function checkExport(err) {
        if(err) throw err;

        fs.stat(imagePaths.test, function(err, stats) {
            var didExport = stats.size > MIN_SIZE;

            t.ok(didExport, mockName + ' should be properly exported as a ' + format);
        });
    }

    request(requestOpts)
        .pipe(saveImageStream)
        .on('close', checkExport);
}