var parser   = require('tap-parser');
var through  = require('through2');
var duplexer = require('duplexer');
var xmlbuilder = require('xmlbuilder');
var extend = require('xtend');
var formatDate = require('format-date')

var defaults = {
	// Whether the TAP comments should not be used as test-suite names
	dontUseCommentsAsTestNames: false,

	// Whether . in test-suite names should be replaced with Unicode dot
	// NOTE: this feature exist because many xUnit reporters assume . in
	// test-suite name implies package hierarchy, which may not be the case.
	replaceWithUnicodeDot: false,

	// If specified, all test-suites will be prefixed with the given
	// package name.
	// NOTE: replaceWithUnicodeDot does not apply to package and . can be
	// used to specify package hierarchy.
	package: '',

	// Whether tap parser should be in strict mode or not, false by default.
	strict: false,
};

module.exports = function(options) {
	var outStream = through();
	var tapParser = parser();

	options = extend(defaults, options);

	tapParser.strict = options.strict;

	var noMoreTests = false;
	var totalNumTests = 0;
	var totalNumFailed = 0;
	var totalNumSkipped = 0;
	var totalNumInconclusive = 0;
	var curNumTests = 0;
	var curNumFailed = 0;
	var curNumSkipped = 0;
	var curNumInconclusive = 0;
	var exitCode = 0;
	var rootXml = xmlbuilder.create('test-results');

	rootXml.att('name', 'Test Results')
	rootXml.att('date', formatDate('{year}-{month}-{day}', new Date()))
	rootXml.att('time', formatDate('{hours}:{minutes}:{seconds}', new Date()))

	rootXml.ele('environment').att('nunit-version', 'na').att('clr-version', 'na').att('os-version', '1.0.0').att('platform', 'node').att('cwd', '/build').att('user', 'na').att('user-domain', 'na').att('machine-name', 'local')
	rootXml.ele('culture-info').att('current-culture', 'na').att('current-uiculture', 'na')

	var testSuiteXml = rootXml.ele('test-suite')
	testSuiteXml.att('name', 'TAP nUnit')
	testSuiteXml.att('type', 'Test Fixture')
	testSuiteXml.att('executed', false)

	var curTestXml = testSuiteXml.ele('results')

	tapParser.on('comment', function(comment) {
		// comment specifies boundaries between testsuites, unless feature disabled.
		if (options.dontUseCommentsAsTestNames) {
			return;
		}
		if (noMoreTests) {
			return;
		}
		// close the current test, if any.
		closeCurTest();
		// create new test
		newTest(comment);
	});

	tapParser.on('assert', function(assert) {
		// no test name was given, so all asserts go in a single test
		if (!curTestXml) {
			newTest('Default');
		}

		var testCaseXml = curTestXml.ele('test-case', {
			name: '#' + assert.id + ' ' + assert.name,
			description: 'TAP nUnit : #' + assert.id + ' ' + assert.name,
			time: '0.01'
		});

		var result = 'Success';
		curNumTests++;
		totalNumTests++;
		if (assert.skip) {
			curNumSkipped++;
			totalNumSkipped++;
			result = 'Skipped';
		} else if (assert.todo) {
			curNumInconclusive++;
			totalNumInconclusive++;
			result = 'Inconclusive';
		} else {
			if (!assert.ok) {
				result = 'Failure'
				curNumFailed++;
				totalNumFailed++;
				exitCode = 1;
				/*var failureXml = testCaseXml.ele('failure');
				if(assert.diag) {
					failureXml.txt(formatFailure(assert.diag));
				}*/
			}
		}

		testCaseXml = testCaseXml.att('executed', 'True')
		testCaseXml = testCaseXml.att('success', assert.ok ? 'True' : 'False')
		testCaseXml = testCaseXml.att('result', result)
	});

	tapParser.on('plan', function(p) {
		// we got to the end, ignore any tests after it
		closeCurTest();
		noMoreTests = true;
	});

	tapParser.on('complete', function(r) {
		// output any parse errors
		if (r.failures) {
			r.failures.forEach(function(fail) {
				if (fail.tapError) {
					var err = new Error('TAP parse error: ' + fail.tapError);
					outStream.emit('error', err);
				}
			});
		}

		rootXml.att('invalid', 0);
		rootXml.att('ignored', 0);
		rootXml.att('inconclusive', totalNumInconclusive);
		rootXml.att('not-run', 0);
		rootXml.att('total', totalNumTests);
		rootXml.att('failures', totalNumFailed);
		if (curNumSkipped > 0) {
			rootXml.att('skipped', totalNumSkipped);
		}
		rootXml.att('errors', totalNumFailed);

		if (totalNumFailed > 0) {
			testSuiteXml.att('result', 'Failure')
		} else {
			testSuiteXml.att('result', 'Success')
		}

		// prettify and output the xUnit xml.
		var xmlString = rootXml.end({
			pretty: true,
			indent: '  ',
			newline: '\n'
		});
		outStream.push(xmlString + '\n');
		outStream.emit('end');
		result.exitCode = exitCode;
	});



	var result = duplexer(tapParser, outStream);

	return result;

	function newTest(testName) {
		testName = formatTestName(testName);
		curNumTests = 0;
		curNumFailed = 0;
		curNumSkipped = 0;
	}

	function closeCurTest() {
		// close the previous test if there is one.

		/*
		if (curTestXml) {
			curTestXml.att('tests', curNumTests);
			curTestXml.att('failures', curNumFailed);
			if (curNumSkipped > 0) {
				curTestXml.att('skipped', curNumSkipped);
			}
			curTestXml.att('errors', 0);
		}
		*/
	}

	function formatTestName(testName) {
		if (options.replaceWithUnicodeDot) {
			var unicodeDot = '\uFF0E'; //full width unicode dot
			testName = testName.replace(/\./g, unicodeDot);
		}

		if (options.package) {
			testName = options.package + '.' + testName;
		}
		if(testName.indexOf('#') === 0) {
			testName = testName.substr(1);
		}
		return testName.trim();
	}

	function formatFailure(diag) {
		var text = '\n          ---\n';

		for(var key in diag) {
			if(diag.hasOwnProperty(key) && diag[key] !== undefined) {
				var value = diag[key];
				text += '            '+key+': ' + (typeof value === 'object' ? JSON.stringify(value) : value) + '\n';
			}
		}

		text += '          ...\n      ';

		return text;
	}
};
