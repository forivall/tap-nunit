var t = require('tap');

t.test('1 === 1', {skip: true}, function(assert) {
  assert.plan(1);
  assert.equal(1, 1);
});

t.test('2 === 2', {skip: true}, function(assert) {
  assert.plan(1);
  assert.equal(2, 2);
});
