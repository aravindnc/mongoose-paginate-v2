# mongoose-paginate-v2
[![npm version](https://img.shields.io/npm/v/mongoose-paginate-v2.svg)](https://www.npmjs.com/package/mongoose-paginate-v2)
[![Dependency Status](https://david-dm.org/aravindnc/mongoose-paginate-v2.svg)](https://david-dm.org/aravindnc/mongoose-paginate-v2)
[![devDependency Status](https://david-dm.org/aravindnc/mongoose-paginate-v2/dev-status.svg)](https://david-dm.org/aravindnc/mongoose-paginate-v2#info=devDependencies)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/aravindnc/mongoose-paginate-v2/issues)
[![HitCount](http://hits.dwyl.io/aravindnc/mongoose-paginate-v2.svg)](http://hits.dwyl.io/aravindnc/mongoose-paginate-v2)

> A cursor based custom pagination library for [Mongoose](http://mongoosejs.com) with customizable labels.

If you are looking for aggregate query pagination, use this one [mongoose-aggregate-paginate-v2](https://github.com/aravindnc/mongoose-aggregate-paginate-v2)

## Installation

```sh
npm install mongoose-paginate-v2
```

## Usage

Add plugin to a schema and then use model `paginate` method:

```js
var mongoose         = require('mongoose');
var mongoosePaginate = require('mongoose-paginate-v2');

var mySchema = new mongoose.Schema({ 
    /* your schema definition */ 
});

mySchema.plugin(mongoosePaginate);

var myModel = mongoose.model('SampleModel',  mySchema); 

myModel.paginate().then({}) // Usage
```

### Model.paginate([query], [options], [callback])

Returns promise

**Parameters**

* `[query]` {Object} - Query criteria. [Documentation](https://docs.mongodb.org/manual/tutorial/query-documents)
* `[options]` {Object}
  - `[select]` {Object | String} - Fields to return (by default returns all fields). [Documentation](http://mongoosejs.com/docs/api.html#query_Query-select) 
  - `[collation]` {Object} - Specify the collation [Documentation](https://docs.mongodb.com/manual/reference/collation/)
  - `[sort]` {Object | String} - Sort order. [Documentation](http://mongoosejs.com/docs/api.html#query_Query-sort) 
  - `[populate]` {Array | Object | String} - Paths which should be populated with other documents. [Documentation](http://mongoosejs.com/docs/api.html#query_Query-populate)
  - `[lean=false]` {Boolean} - Should return plain javascript objects instead of Mongoose documents?  [Documentation](http://mongoosejs.com/docs/api.html#query_Query-lean)
  - `[leanWithId=true]` {Boolean} - If `lean` and `leanWithId` are `true`, adds `id` field with string representation of `_id` to every document
  - `[offset=0]` {Number} - Use `offset` or `page` to set skip position
  - `[page=1]` {Number}
  - `[limit=10]` {Number}
  - `[customLabels]` {Object} - Developers can provide custom labels for manipulating the response data.
* `[callback(err, result)]` - If specified the callback is called once pagination results are retrieved or when an error has occurred

**Return value**

Promise fulfilled with object having properties:
* `docs` {Array} - Array of documents
* `totalDocs` {Number} - Total number of documents in collection that match a query
* `limit` {Number} - Limit that was used
* `hasPrevPage` {Bool} - Availability of prev page.
* `hasNextPage` {Bool} - Availability of next page.
* `page` {Number} - Current page number 
* `totalPages` {Number} - Total number of pages.
* `offset` {Number} - Only if specified or default `page`/`offset` values were used
* `prevPage` {Number} - Previous page number if available or NULL
* `nextPage` {Number} - Next page number if available or NULL
* `pagingCounter` {Number} - The starting sl. number of first document.

Please note that the above properties can be renamed by setting customLabel attribute.

### Sample Usage

#### Return first 10 documents from 100

```javascript

const options = {
    page: 1,
    limit: 10,
	collation: {
		locale: 'en'
	}
};

Model.paginate({}, options, function(err, result) {
    // result.docs
    // result.totalDocs = 100
    // result.limit = 10
    // result.page = 1
    // result.totalPages = 10    
    // result.hasNextPage = true
    // result.nextPage = 2
    // result.hasPrevPage = false
    // result.prevPage = null
	// result.pagingCounter = 1
    
});
```

### With custom return labels

Now developers can specify the return field names if they want. Below are the list of attributes whose name can be changed.

* totalDocs
* docs
* limit
* page
* nextPage
* prevPage
* totalPages
* pagingCounter

You should pass the names of the properties you wish to changes using `customLabels` object in options.

Same query with custom labels
```javascript

const myCustomLabels = {
    totalDocs: 'itemCount',
    docs: 'itemsList',
    limit: 'perPage',
    page: 'currentPage',
    nextPage: 'next',
    prevPage: 'prev',
    totalPages: 'pageCount'
	pagingCounter: 'slNo'
};

const options = {
    page: 1,
    limit: 10,
    customLabels: myCustomLabels
};

Model.paginate({}, options, function(err, result) {
    // result.itemsList [here docs become itemsList]
    // result.itemCount = 100 [here totalDocs becomes itemCount]
    // result.perPage = 10 [here limit becomes perPage]
    // result.currentPage = 1 [here page becomes currentPage]
    // result.pageCount = 10 [here totalPages becomes pageCount]
    // result.next = 2 [here nextPage becomes next]
    // result.prev = null [here prevPage becomes prev]
	// result.slNo = 1 [here pagingCounter becomes slNo]
    
    // result.hasNextPage = true [not changeable]
    // result.hasPrevPage = false [not changeable]
});
```

### Other Examples

Using `offset` and `limit`:
```javascript
Model.paginate({}, { offset: 30, limit: 10 }, function(err, result) {
    // result.docs
    // result.totalPages
    // result.limit - 10
    // result.offset - 30
});
```

With promise:
```js
Model.paginate({}, { offset: 30, limit: 10 }).then(function(result) {
    // ...
});
```

#### More advanced example

```javascript
var query   = {};
var options = {
    select:   'title date author',
    sort:     { date: -1 },
    populate: 'author',
    lean:     true,
    offset:   20, 
    limit:    10
};

Book.paginate(query, options).then(function(result) {
    // ...
});
```

#### Zero limit

You can use `limit=0` to get only metadata:

```javascript
Model.paginate({}, { offset: 100, limit: 0 }).then(function(result) {
    // result.docs - empty array
    // result.totalDocs
    // result.limit - 0
    // result.offset - 100
});
```

#### Set custom default options for all queries

config.js:
```javascript
var mongoosePaginate = require('mongoose-paginate-v2');

mongoosePaginate.paginate.options = { 
    lean:  true,
    limit: 20
};
```

controller.js:
```javascript
Model.paginate().then(function(result) {
    // result.docs - array of plain javascript objects
    // result.limit - 20
});
```

## Thanks
This is a advanced version of mongoose-paginate forked from [Mongoose Paginate](https://www.npmjs.com/package/mongoose-paginate). Credits to the initial author [Edward Hotchkiss](https://www.npmjs.com/~edwardhotchkiss)

## License
[MIT](LICENSE)
