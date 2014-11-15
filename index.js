/*
 * Convenience wrapper for creating custom element prototypes.
 */

var dotty = require('dotty')
var slice = require('sliced')
var clone = require('clone')
var uuid = require('uuid')

function noop(){}

module.exports = createCustom

function createCustom(proto) {
  proto = proto || HTMLElement.prototype

  var CustomHTMLElement = Object.create(proto)
  var listeners = CustomHTMLElement.listeners = clone(CustomHTMLElement.listeners || {})
  var observers = CustomHTMLElement.observers = clone(CustomHTMLElement.observers || {})
  var bindings = CustomHTMLElement.bindings = clone(CustomHTMLElement.bindings || [])

  CustomHTMLElement.bind = bindToKey
  CustomHTMLElement.attributeChangedCallback = when('attribute')
  CustomHTMLElement.detachedCallback = when('detach')
  CustomHTMLElement.attachedCallback = when('attach')
  CustomHTMLElement.createdCallback = when('created')

  var onceKey  = '__once__' + uuid()
  var onces    = 0
  var exported = {
      when: listenWhen
    , once: listenOnce
    , bind: listenBind
    , prototype: CustomHTMLElement
    , use: use
  }

  return exported

  function when(key) {
    return function() {
      var self = this
      var args = slice(arguments)
      var fire = listeners[key]
      if (listeners && listeners[key]) {
        fire.forEach(function(fn) {
          fn.apply(self, args)
        })
      }
      return this
    }
  }

  function use(fn) {
    fn && fn(exported)
    return exported
  }

  function bindToKey(name, observer) {
    var observers = this._observers = this._observers || {}

    for (var i = 0; i < bindings.length; i++) {
      var b = bindings[i]
      if (b.name === name) {
        observers[name] = observers[name] || multiListener(observer)
        observers[name].call(this, b.fn)
      }
    }

    if (observers[name]) return
    return HTMLElement.prototype.bind.apply(this, arguments)
  }

  // observer.open can only attach a single callback,
  // so to respond to multiple events we have to add that
  // functionality in ourself.
  //
  // We keep a cache of observers, by key, for each
  function multiListener(observer) {
    var listeners = []
    var l = 0

    observer.open(function() {
      var args = slice(arguments)
      for (var i = 0; i < l; i += 1) {
        listeners[i][1].apply(listeners[i][0], args)
      }
    })

    return function(listener) {
      l += 1
      listeners.push([this, listener])
    }
  }

  function listenWhen(key, listener) {
    listeners[key] = listeners[key] || []
    listeners[key].push(listener)
    return exported
  }

  // We have to set a property directly on the instance
  // to avoid "once" being scoped to *every* instance of
  // an element. In the future, a hypothetical
  // "prototype-emitter" module could make this nicer and
  // more performant.
  function listenOnce(key, listener) {
    var hasEmitted = onceKey + onces++

    return listenWhen(key, function() {
      if (this[hasEmitted]) return

      this[hasEmitted] = true

      return listener.apply(this
        , slice(arguments)
      )
    })
  }

  function listenBind(attr, listener) {
    bindings.push({
        name: attr
      , fn: listener
    })

    // The current implementation of HTMLElement::bind
    // doesn't account for when elements are first attached
    // to the DOM, despite Polymer taking care of this.
    return listenWhen('attach', function() {
      var value = this.getAttribute(attr)
      if (!isBinding(value)) return // ignore non-bindings

      var model = this.templateInstance && this.templateInstance.model
      if (!model) {
        console.warn('Attached bound element with no container template: ', this)
        return // ignore no template-instance model
      }

      // if there's more than one pair of mustaches,
      // just emit the concatenated string.
      if (hasMultipleMustaches(value)) {
        value = value.replace(/\{\{([^{}]*)}}/g, function(_, key) {
          return dotty.get(model, key)
        })

        return listener.call(this, value)
      }

      value = value.match(/\{\{([^{}]*)}}/)[1]
      value = value.replace(/^\{\{|}}$/g, '')

      if (!validPath(value)) return // can't do any more useful work.

      value = dotty.get(model, value)

      // Currently, don't trigger an event if
      // the value is undefined, as that's probably
      // not intended anyway.
      if (typeof value !== 'undefined') {
        listener.call(this, value)
      }
    })
  }
}

function isBinding(str) {
  return str && /\{\{(?:[^{}]*)}}/g.test(str)
}

function hasMultipleMustaches(value) {
  return value.match(/\{\{([^{}]*)}}/g).length > 1
}

/**
 * Originally sourced from Polymer's observ
 */
var sepExpression = '\\s*\\.\\s*'
var keyExpression = '(?:[\\$_a-zA-Z][\\$_a-zA-Z0-9]*|(?:[0-9]|[1-9][0-9]+))'
var validExpression = new RegExp('^' +
  keyExpression + '(?:' +
  sepExpression +
  keyExpression +
'){0,}$', 'g')

function validPath(path) {
  if (Array.isArray(path)) return true
  if (typeof path !== 'string') return
  if (path[0] === '.') return
  var result = validExpression.test(path)
  if (result) validExpression.lastIndex = 0
  return result
}
