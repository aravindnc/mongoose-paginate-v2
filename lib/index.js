"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * @param {Object}              [query={}]
 * @param {Object}              [options={}]
 * @param {Object|String}       [options.select='']
 * @param {Object|String}       [options.projection={}]
 * @param {Object}              [options.options={}]
 * @param {Object|String}       [options.sort]
 * @param {Object|String}       [options.customLabels]
 * @param {Object}              [options.collation]
 * @param {Array|Object|String} [options.populate]
 * @param {Boolean}             [options.lean=false]
 * @param {Boolean}             [options.leanWithId=true]
 * @param {Number}              [options.offset=0] - Use offset or page to set skip position
 * @param {Number}              [options.page=1]
 * @param {Number}              [options.limit=10]
 * @param {Function}            [callback]
 *
 * @returns {Promise}
 */
var deafultOptions = {
  customLabels: {
    totalDocs: 'totalDocs',
    limit: 'limit',
    page: 'page',
    totalPages: 'totalPages',
    docs: 'docs',
    nextPage: 'nextPage',
    prevPage: 'prevPage',
    pagingCounter: 'pagingCounter'
  },
  collation: {},
  lean: false,
  leanWithId: true,
  limit: 10,
  projection: {},
  select: '',
  options: {}
};

function paginate(query, options, callback) {
  options = _objectSpread({}, deafultOptions, paginate.options, options);
  query = query || {};
  var _options = options,
      collation = _options.collation,
      customLabels = _options.customLabels,
      lean = _options.lean,
      leanWithId = _options.leanWithId,
      limit = _options.limit,
      populate = _options.populate,
      projection = _options.projection,
      select = _options.select,
      sort = _options.sort;
  var isCallbackSpecified = typeof callback === 'function';
  var findOptions = options.options;
  var offset;
  var page;
  var skip;
  var docsPromise = [];
  var docs = []; // Labels

  var labelDocs = customLabels.docs;
  var labelLimit = customLabels.limit;
  var labelNextPage = customLabels.nextPage;
  var labelPage = customLabels.page;
  var labelPagingCounter = customLabels.pagingCounter;
  var labelPrevPage = customLabels.prevPage;
  var labelTotal = customLabels.totalDocs;
  var labelTotalPages = customLabels.totalPages;

  if (options.hasOwnProperty('offset')) {
    offset = parseInt(options.offset, 10);
    skip = offset;
  } else if (options.hasOwnProperty('page')) {
    page = parseInt(options.page, 10);
    skip = (page - 1) * limit;
  } else {
    offset = 0;
    page = 1;
    skip = offset;
  }

  var countPromise = this.countDocuments(query).exec();

  if (limit) {
    var mQuery = this.find(query, projection, findOptions);
    mQuery.select(select);
    mQuery.sort(sort);
    mQuery.lean(lean); // Hack for mongo < v3.4

    if (Object.keys(collation).length > 0) {
      mQuery.collation(collation);
    }

    mQuery.skip(skip);
    mQuery.limit(limit);

    if (populate) {
      mQuery.populate(populate);
    }

    docsPromise = mQuery.exec();

    if (lean && leanWithId) {
      docsPromise = docsPromise.then(function (docs) {
        docs.forEach(function (doc) {
          doc.id = String(doc._id);
        });
        return docs;
      });
    }
  }

  return Promise.all([countPromise, docsPromise]).then(function (values) {
    var _values = _slicedToArray(values, 2),
        count = _values[0],
        docs = _values[1];

    var result = {
      [labelDocs]: docs,
      [labelTotal]: count,
      [labelLimit]: limit
    };

    if (typeof offset !== 'undefined') {
      result.offset = offset;
    }

    if (typeof page !== 'undefined') {
      var pages = limit > 0 ? Math.ceil(count / limit) || 1 : null;
      result.hasPrevPage = false;
      result.hasNextPage = false;
      result[labelPage] = page;
      result[labelTotalPages] = pages;
      result[labelPagingCounter] = (page - 1) * limit + 1; // Set prev page

      if (page > 1) {
        result.hasPrevPage = true;
        result[labelPrevPage] = page - 1;
      } else {
        result[labelPrevPage] = null;
      } // Set next page


      if (page < pages) {
        result.hasNextPage = true;
        result[labelNextPage] = page + 1;
      } else {
        result[labelNextPage] = null;
      }
    }

    return isCallbackSpecified ? callback(null, result) : Promise.resolve(result);
  }).catch(function (error) {
    return isCallbackSpecified ? callback(error) : Promise.reject(error);
  });
}
/**
 * @param {Schema} schema
 */


module.exports = function (schema) {
  schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;