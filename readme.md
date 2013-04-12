Backbone.Flexisync
======================

**v0.1.0**

Maintained by Nico Burns [@nicoburns](http://twitter.com/nicoburns).

Overrides Backbone.Sync with support for fetching and combining data from multiple sources (multiple api endpoints, localstorage and or an in-memory cache) in a single `fetch()` call.

Depends on Underscore, Backbone, and jQuery.  You can swap out the dependencies
with a custom configuration. AMD compatible.

## Documentation ##

http://github.com/nicoburns/backbone.flexisync/wiki

## Changelog ##

### 0.0.1 ###

* Initial release

## Usage

Include Backbone.Flexisync and config options after having included Backbone.js:

```html
<script type="text/javascript" src="backbone.js"></script>
<script type="text/javascript" src="backbone.flexisync.js"></script>
<script type="text/javascript">
	// Which datastores to fetch from (in order of preference)
    Backbone.Flexisync.options.fetchFrom = ["memory", "localstorage", "remote"];

    // Which datastores to cache data to (optional)
    Backbone.Flexisync.options.cacheTo = ["memory", "localstorage"];
</script>;
```

Create your Models and Collections as normal, optionally overiding the datasources on a per model or per fetch basis

```javascript
var myModel = Backbone.Model.extend({
  fetchFrom: ["remote"], // Optionally override which datastore to fetch from for this model
  
  // ... everything else is normal.
});

myModel.fetch({from: ["localstorage"], cacheTo: []}) // Optionally override which datastore to fetch from for this fetch
```
### RequireJS

Backbone.Flexisync is fully AMD compatible, so simply require it as a dependency.

Have fun!

## License

Licensed under MIT license

Copyright (c) 2013 Nico Burns

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.