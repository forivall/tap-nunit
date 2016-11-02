var t = require('tap');

t.test('1 === 1', {todo: true}, function(assert) {
	assert.plan(1);
	assert.equal(1, 1);
});

t.test('2 === 2', {todo: true}, function(assert) {
	assert.plan(1);
	assert.equal(2, 2);
});
