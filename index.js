/*
 * Convenience wrapper for creating custom element prototypes.
 */

var slice = require('sliced')
var clone = require('clone')
var uuid = require('uuid')

function noop(){}

module.exports = createCustom

function createCustom(proto) {
  proto = proto || HTMLElement.prototype

  var CustomHTMLElement = Object.create(proto)
  var listeners = CustomHTMLElement.listeners = clone(CustomHTMLElement.listeners || {})

  CustomHTMLElement.attributeChangedCallback = when('attribute')
  CustomHTMLElement.detachedCallback = when('detach')
  CustomHTMLElement.attachedCallback = when('attach')
  CustomHTMLElement.createdCallback = when('created')

  var onceKey  = '__once__' + uuid()
  var onces    = 0
  var exported = {
      when: listenWhen
    , once: listenOnce
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
}
