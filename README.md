# custom-element

Experimental: convenience wrapper for creating custom element prototypes.

```javascript
require('webcomponents.js')

var createCustom = require('custom-element')

var CustomHTMLElement = createCustom(function() {
  // created
}).on('created', function() {
  // alternative syntax for created
}).on('attached', function() {
  // attached to the DOM
}).on('detached', function() {
  // detached from the DOM
}).on('attribute', function(value) {
  // when an attribute is changed via setAttribute.
  // Note that values are coerced into strings.
})

document.registerElement('custom-element', CustomHTMLElement)
```
