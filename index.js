var parser   = require('tap-parser');
var through  = require('through2');
var duplexer = require('duplexer');

module.exports = function() {
  var tap = parser();
  var out = through.obj();
  var stream = duplexer(tap, out);

  var data = [];
	var errors = [];
	var current = null;
  var name = null;
	var outputStart = `
		<?xml version="1.0"?>
		<test-results name="Karma Results" date="2016-06-30" time="13:34:09" invalid="0" ignored="0" inconclusive="0" not-run="0" errors="0" total="438" failures="0" skipped="1">
		  <environment nunit-version="na" clr-version="na" os-version="15.5.0" platform="darwin" cwd="/Users/luke.channings/Projects/Volvo/vcc-stream2-vbs/src/Volvo.Vbs.Frontend/build" user="na" user-domain="na" machine-name="LON04042"/>
		  <culture-info current-culture="na" current-uiculture="na"/>
		  <test-suite name="PhantomJS 1.9.8 (Mac OS X 0.0.0)" type="TestFixture" executed="false" result="Success">
		    <results>
	`;
	var outputEnd = `
				</results>
			</test-suite>
	</test-results>`

	tap.on('comment', function(res) {
    current = '\n' + '  ' + res
  })

	tap.on('assert', function(res) {
    var assert = current + ' ' + res.name
    if (!res.ok) errors.push(assert)
  })

	tap.on('extra', function(res) {
    if (res !== '') errors.push(res)
  })

	tap.on('results', function(res) {
    var count = res.asserts.length
    out.push('\n')

    if (errors.length) {
      errors.forEach(function(error) {
        out.push(error)
      })
    } else {
      out.push('no errors')
    }

    out.push('\n')
  })

	stream.errors = errors
  return stream;
};
