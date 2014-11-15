require('polyfill-webcomponents')

var createCustom = require('./')
var domify = require('domify')
var test = require('tape')

var ids = 0
function generateName() {
  return 'custom-element-' + ids++
}

test('custom prototype', function(t) {
  var name = generateName()
  t.plan(2)

  var proto = Object.create(HTMLTemplateElement.prototype)

  document.register(name, createCustom(proto)
  .when('created', function() {
    t.pass('element created was called')
  }))

  var el = document.createElement(name)
  t.ok(el instanceof HTMLTemplateElement)
})

test('custom prototype extending existing custom element fires both element handlers', function(t) {
  var name = generateName()
  t.plan(8)

  var superElement = createCustom()
  .when('created', function() {
    t.pass('super element created was called')
  })
  .when('attach', function() {
    t.pass('super element attach was called')
  })
  .once('attach', function() {
    t.pass('super element attach once was called')
  })

  var inhertingElement = createCustom(superElement.prototype)
  .when('created', function() {
    t.pass('inheriting element created was called')
  })
  .when('attach', function() {
    t.pass('inheriting element attach was called')
  })
  .once('attach', function() {
    t.pass('inheriting element attach once was called')
  })

  document.register(name, inhertingElement)

  var el = document.createElement(name)
  document.body.appendChild(el)
  process.nextTick(function() {
    document.body.removeChild(el)
    process.nextTick(function() {
      document.body.appendChild(el)
      process.nextTick(function() {
        document.body.removeChild(el)
      })
    })
  })
})

test('when("created")', function(t) {
  var name = generateName()
  t.plan(1)

  document.register(name, createCustom().when("created", function() {
    t.pass('element created was called')
  }))

  document.createElement(name)
})

test('when("created") and factory', function(t) {
  var name = generateName()
  t.plan(2)

  document.register(name, createCustom()
  .when('created', function() {
    t.pass('element created was called')
  }).when("created", function() {
    t.pass('element when created was called')
  }))

  document.createElement(name)
})

test('when("attach")', function(t) {
  var name = generateName()
  var attached = false

  t.plan(2)

  document.register(name, createCustom()
  .when('created', function() {
    t.pass('element constructor was called')
  }).when('attach', function() {
    t.ok(attached, 'event triggered after being added to DOM')
  }))

  var el = document.createElement(name)
  attached = true
  document.body.appendChild(el)
  process.nextTick(function() {
    document.body.removeChild(el)
  })
})

test('when("detach")', function(t) {
  var name = generateName()
  var attached = true

  t.plan(2)

  document.register(name, createCustom()
  .when('created', function() {
    t.pass('element constructor was called')
  }).when('detach', function() {
    t.ok(!attached, 'event triggered after being removed from DOM')
  }))

  var el = document.createElement(name)
  document.body.appendChild(el)
  process.nextTick(function() {
    attached = false
    document.body.removeChild(el)
  })
})

test('when("attribute")', function(t) {
  var name = generateName()

  t.plan(3)

  document.register(name, createCustom()
  .when('created', function() {
    t.pass('element constructor was called')
  }).when('attribute', function(name, _, value) {
    t.equal(name, 'hello', 'correct attribute name passed to listener')
    t.equal(value, 'world', 'correct attribute value passed to listener')
  }))

  var el = document.createElement(name)
  el.setAttribute('hello', 'world')
})

test('inherits from parent custom-element prototypes', function(t) {
  var name1 = generateName()
  var name2 = generateName()

  t.plan(3)

  var parent = createCustom()
    .when('created', function() {
      t.pass('parent created callback is called')
    })

  var child = createCustom(parent.prototype)
    .when('created', function() {
      t.pass('child created callback is called')
    })

  document.register(name1, parent)
  document.register(name2, child)
  document.createElement(name1)
  document.createElement(name2)

})

test('once', function(t) {
  var name = generateName()
  var attached = false

  var count = 0
  var total = 0
  document.register(name, createCustom()
  .when('created', function() {
    t.pass('element constructor was called')
  }).when('attach', function() {
    total += 1
  }).once('attach', function() {
    t.equal(++count, 1)
  }))

  setTimeout(function() {
    t.equal(count, 1)
    t.notEqual(total, 1)
    t.end()
  }, 100)

  var el = document.createElement(name)
  attached = true
  document.body.appendChild(el)
  process.nextTick(function() {
    document.body.removeChild(el)
    process.nextTick(function() {
      document.body.appendChild(el)
      process.nextTick(function() {
        document.body.removeChild(el)
      })
    })
  })
})

test('once (per instance, not per class)', function(t) {
  var name = generateName()
  var attached = false

  var count = 0
  var total = 0
  document.register(name, createCustom()
  .when('created', function() {
    t.pass('element constructor was called')
  }).when('attach', function() {
    total += 1
  }).once('attach', function() {
    count += 1
  }))

  setTimeout(function() {
    t.equal(count, 2)
    t.ok(total > 2)
    t.end()
  }, 100)

  var el1 = document.createElement(name)
  var el2 = document.createElement(name)
  attached = true
  document.body.appendChild(el1)
  document.body.appendChild(el2)
  process.nextTick(function() {
    document.body.removeChild(el1)
    document.body.removeChild(el2)
    process.nextTick(function() {
      document.body.appendChild(el1)
      document.body.appendChild(el2)
      process.nextTick(function() {
        document.body.removeChild(el1)
        document.body.removeChild(el2)
      })
    })
  })
})
