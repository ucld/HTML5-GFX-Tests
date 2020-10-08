# HTML5-GFX-Tests
Experimental HTML5 GFX Wrapper.

Some features:
* Sprite-based rendering
  * ``.loadSprite(src, x, y, w, h)``
* Bitmap-font rendering
  * ``.loadText(text, x, y)``
* Fake Type Safety
  * ``typedVar('string', 'Hello')``
  * ``typedFn('string -> number', (str) => str.length)``
* Low memory allocation
  * No memory allocation after startup.

Currently a proof of concept, which I hope to improve and clean up one day.
