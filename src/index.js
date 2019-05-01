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

const defaultOptions = {
  customLabels: {
    totalDocs: 'totalDocs',
    limit: 'limit',
    page: 'page',
    totalPages: 'totalPages',
    docs: 'docs',
    nextPage: 'nextPage',
    prevPage: 'prevPage',
    pagingCounter: 'pagingCounter',
  },
  collation: {},
  lean: false,
  leanWithId: true,
  limit: 10,
  projection: {},
  select: '',
  options: {},
};

function paginate(query, options, callback) {
  options = {
    ...defaultOptions,
    ...paginate.options,
    ...options
  };
  query = query || {};

  const {
    collation,
    lean,
    leanWithId,
    populate,
    projection,
    select,
    sort,
  } = options;

  const customLabels = {
    ...defaultOptions.customLabels,
    ...options.customLabels
  };

  const limit = parseInt(options.limit, 10) || 0;

  const isCallbackSpecified = typeof callback === 'function';
  const findOptions = options.options;

  let offset;
  let page;
  let skip;

  let docsPromise = [];
  let docs = [];

  // Labels
  const labelDocs = customLabels.docs;
  const labelLimit = customLabels.limit;
  const labelNextPage = customLabels.nextPage;
  const labelPage = customLabels.page;
  const labelPagingCounter = customLabels.pagingCounter;
  const labelPrevPage = customLabels.prevPage;
  const labelTotal = customLabels.totalDocs;
  const labelTotalPages = customLabels.totalPages;

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

  const countPromise = this.countDocuments(query).exec();

  if (limit) {
    const mQuery = this.find(query, projection, findOptions);
    mQuery.select(select);
    mQuery.sort(sort);
    mQuery.lean(lean);

    // Hack for mongo < v3.4
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
      docsPromise = docsPromise.then((docs) => {
        docs.forEach((doc) => {
          doc.id = String(doc._id);
        });
        return docs;
      });
    }

  }

  return Promise.all([countPromise, docsPromise])
    .then((values) => {
      const [count, docs] = values;
      const result = {
        [labelDocs]: docs,
        [labelTotal]: count,
        [labelLimit]: limit
      };

      if (typeof offset !== 'undefined') {
        result.offset = offset;
      }

      if (typeof page !== 'undefined') {

        const pages = (limit > 0) ? (Math.ceil(count / limit) || 1) : null;

        result.hasPrevPage = false;
        result.hasNextPage = false;

        result[labelPage] = page;
        result[labelTotalPages] = pages;
        result[labelPagingCounter] = ((page - 1) * limit) + 1;

        // Set prev page
        if (page > 1) {
          result.hasPrevPage = true;
          result[labelPrevPage] = (page - 1);
        } else {
          result[labelPrevPage] = null;
        }

        // Set next page
        if (page < pages) {
          result.hasNextPage = true;
          result[labelNextPage] = (page + 1);
        } else {
          result[labelNextPage] = null;
        }
      }

      return isCallbackSpecified ? callback(null, result) : Promise.resolve(result);
    }).catch((error) => {
      return isCallbackSpecified ? callback(error) : Promise.reject(error);
    });
}

/**
 * @param {Schema} schema
 */
module.exports = (schema) => {
  schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;