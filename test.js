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

test('bind(name)', function(t) {
  var elName = generateName()

  t.plan(4)

  document.register(elName, createCustom()
  .when('created', function() {
    t.pass('element constructor was called')
  }).bind('hello', function(value, before) {
    t.deepEqual(value, { a: 3, b: 5 })
  }).bind('hello', function(value, before) {
    t.deepEqual(value, { a: 3, b: 5 })
    t.pass('second binding is called as well')
  }))

  var template = domify([
      '<template bind>'
      , '<'+elName+' hello="{{world}}"></'+elName+'>'
    , '</template>'
  ].join('\n'))

  document.body.appendChild(template)
  template.bindingDelegate = new PolymerExpressions
  template.model = {}
  setTimeout(function() {
    template.model.world = { a: 3, b: 5 }
    document.body.removeChild(template)
    document.body.removeChild(document.body.querySelector(elName))
  }, 500)
})
test('bind(name) - correct contexts', function(t) {
  var elName = generateName()
  var attrs = {}

  t.plan(1)

  document.register(elName, createCustom()
  .bind('hello', function(value, before) {
    var attr = this.getAttribute('uid')
    attrs[attr] = attrs[attr] || 0
    attrs[attr] += 1
  })
  .bind('hello', function(value, before) {
    var attr = this.getAttribute('uid')
    attrs[attr] = attrs[attr] || 0
    attrs[attr] += 1
  }))

  var template = domify([
      '<template bind>'
      , '<'+elName+' hello="{{world}}" uid="b"></'+elName+'>'
      , '<'+elName+' hello="{{world}}" uid="c"></'+elName+'>'
    , '</template>'
  ].join('\n'))

  document.body.appendChild(template)
  template.bindingDelegate = new PolymerExpressions
  template.model = {}

  setTimeout(function() {
    template.model.world = { a: 3, b: 5 }
    document.body.removeChild(template)
    document.body.removeChild(document.body.querySelector(elName))

    setTimeout(function() {
      // ensure the bindings are called from
      // the correct context
      t.deepEqual(attrs, { b: 2, c: 2 })
    }, 500)
  }, 500)
})

test('bind(name) - triggers on attach', function(t) {
  var name = generateName()

  t.plan(2)

  document.register(name, createCustom()
  .bind('bound', function(value) {
    t.pass('binding was fired')
    t.deepEqual({
      hello: 'world'
    }, value, 'pass the real object')
  }))

  var template = domify([
      '<template bind>'
      , '<'+name+' bound="text and {{bindee}}"></'+name+'>'
    , '</template>'
  ].join('\n'))

  document.body.appendChild(template)
  template.bindingDelegate = new PolymerExpressions()
  template.model = { bindee: { hello: 'world' } }
})

test('bind(name) - multiple mustaches results in a string', function(t) {
  var name = generateName()

  t.plan(2)

  document.register(name, createCustom()
  .bind('bound', function(value) {
    t.pass('binding was fired')
    t.equal(value, '[object Object] and [object Object]')
  }))

  var template = domify([
      '<template bind>'
      , '<'+name+' bound="{{bindee1}} and {{bindee2}}"></'+name+'>'
    , '</template>'
  ].join('\n'))

  document.body.appendChild(template)
  template.bindingDelegate = new PolymerExpressions()
  template.model = {
      bindee1: { hello: 'world' }
    , bindee2: { lorem: 'ipsum' }
  }
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
