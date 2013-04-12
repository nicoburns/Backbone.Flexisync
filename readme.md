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

### 0.1.0 ###

* Initial release

## Usage

Include Backbone.Flexisync and config options after having included Backbone.js:

```html
<script type="text/javascript" src="backbone.js"></script>
<script type="text/javascript" src="backbone.flexisync.js"></script>
<script type="text/javascript">
	// Which datastores to fetch from (in order of preference)
    Backbone.Flexisync.options.fetchFrom = ["memory", "localstorage", "remote"];

    // If cacheTo is specified then the return data of remote requests is cached to the specified
    // data stores and can be fetched from there the next time that data is requested.
    Backbone.Flexisync.options.cacheTo = ["memory", "localstorage"];
</script>;
```

Create and add a remote 'datasources'. This tells the synclayer where it can get certain data from.

```javascript
var usersSource = {
    url: "http://mysites.com/api/users",
    returnData: ["users"],
    parse: function (rawApiResponse) {
    	// This function is useful if the API sends back data in different format to the one that
    	// you want. However, in this case we just pass through the raw response

    	// This value is sent to any RequestMatcher that requires 'users' data
        return {
        	"users": rawApiResponse
        }
    }
};
Backbone.Flexisync.datastores.remote.addSource(usersSource);

var usergroupsSource = {
    url: "http://mysites.com/api/usergroups",
    returnData: ["usergroups"],
    parse: function (rawApiResponse) {
    	// This value is sent to any RequestMatcher that requires 'usergroups' data
        return {
        	"usergroups": rawApiResponse
        }
    }
};
Backbone.Flexisync.datastores.remote.addSource(usergroupsSource);
```

Create and register a 'Request Matcher'. This matches against the url you pass to your model, and tells the synclayer that it should intercept a fetch request.

```javascript

var usersMatcher = {
    pattern: /^users\/([0-9]+)$/, // Matches flexisync://users/123
    requiredData: ["users"], // These are the same as the datasource's returnData
    parse: function (data, id) {
    	// The id comes from the brackets in the regex above

        // This value is sent to the model
        return data.users[id];
    }
};
Backbone.Flexisync.RequestMatcher.register(usersMatcher);

var usergroupsMatcher = {
    pattern: /^usergroups$/, // Matches flexisync://usergroups
    requiredData: ["users", "usergroups"], // These are the same as the datasource's returnData
    parse: function (data) {
    	// This function takes stored usergroup id's and fetches the user data for each id,
    	// returning an array of user data.
        var usergroups = [];
        _.each(data.usergroups, function (id) {
            if (data.users[id]) {
                usergroups.push(data.users[id]);
            }
        });

        // This value is sent to the model
        return allproducts;
    }
};
Backbone.Flexisync.RequestMatcher.register(usergroupsMatcher);
```

Create your Models and Collections as normal, specifying a special url, and optionally overiding the datastores to fetch from on a per model or per fetch basis

```javascript

var usergroupsModel = Backbone.Model.extend({
  url: "flexisync://usergroups" // Url is 'flexisync://' + the RequestMatcher's pattern
  
  // ... everything else is normal.
});

usergroupsModel.fetch();
usergroupsModel.fetch({from: "remote"}); // Fetch from the server for this fetch

var userModel = Backbone.Model.extend({
  fetchFrom: ["remote"], // For this model, only allow the remote datastore (always fetch from the server)
  cacheTo: [], // And don't cache the data
  url: function () {
  	return "flexisync://users" + this.get("id");
  },
  
  // ... everything else is normal.
});

userModel.fetch();
usergroupsModel.fetch({cacheTo: ["localstorage"]}); // Cache this fetch to localstorage
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