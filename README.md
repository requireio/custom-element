# custom-element

Experimental: convenience wrapper for creating custom element prototypes.

```javascript
require('polyfill-webcomponents')

var createCustom = require('custom-element')

var CustomHTMLElement = createCustom(function() {
  // created
}).when('created', function() {
  // alternative syntax for created
}).when('attach', function() {
  // attached to the DOM
}).when('detach', function() {
  // detached from the DOM
}).when('attribute', function(value) {
  // when an attribute is changed via setAttribute.
  // Note that values are coerced into strings.
}).bind('title', function(value, before) {
  // listen to changes in attributes bound using
  // template interpolation, e.g.:
  //
  // <template bind>
  //   <custom-element title="{{post.title}}">
  // </template>
  //
  // This will get called whenever post.title changes.
  // Note that this is not called when initiating
  // the element with template.model = {}
})

document.register('custom-element', CustomHTMLElement)
```
