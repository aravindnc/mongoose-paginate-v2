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
 * @param {Boolean}             [options.leanWithVirtuals=false]
 * @param {Number}              [options.offset=0] - Use offset or page to set skip position
 * @param {Number}              [options.page=1]
 * @param {Number}              [options.limit=10]
 * @param {Boolean}             [options.useEstimatedCount=true] - Enable estimatedDocumentCount for larger datasets. As the name says, the count may not abe accurate.
 * @param {(function(query: Object=): Promise<number>)} [options.useCustomCountFn=false] - Use custom function for count datasets. Receives `query` as an optional argument.
 * @param {Object}              [options.read={}] - Determines the MongoDB nodes from which to read.
 * @param {Function}            [callback]
 *
 * @returns {Promise}
 */
const PaginationParametersHelper = require('./pagination-parameters');
const paginateSubDocsHelper = require('./pagination-subdocs');
const paginateQueryHelper = require('./pagination-queryHelper');

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
    hasPrevPage: 'hasPrevPage',
    hasNextPage: 'hasNextPage',
    meta: null,
  },
  collation: {},
  lean: false,
  leanWithId: true,
  leanWithVirtuals: false,
  limit: 10,
  projection: {},
  select: '',
  options: {},
  pagination: true,
  useEstimatedCount: false,
  useCustomCountFn: false,
  forceCountFn: false,
  allowDiskUse: false,
  customFind: 'find',
};

function paginate(query, options, callback) {
  options = {
    ...defaultOptions,
    ...paginate.options,
    ...options,
  };
  query = query || {};

  const {
    collation,
    lean,
    leanWithId,
    leanWithVirtuals,
    populate,
    projection,
    read,
    select,
    sort,
    pagination,
    useEstimatedCount,
    useCustomCountFn,
    forceCountFn,
    allowDiskUse,
    customFind,
  } = options;

  const customLabels = {
    ...defaultOptions.customLabels,
    ...options.customLabels,
  };

  let limit = defaultOptions.limit;

  if (pagination && !isNaN(Number(options.limit))) {
    limit = parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 0;
  }

  const isCallbackSpecified = typeof callback === 'function';
  const findOptions = options.options;

  let offset;
  let page;
  let skip;

  let docsPromise = [];

  // Labels
  const labelDocs = customLabels.docs;
  const labelLimit = customLabels.limit;
  const labelNextPage = customLabels.nextPage;
  const labelPage = customLabels.page;
  const labelPagingCounter = customLabels.pagingCounter;
  const labelPrevPage = customLabels.prevPage;
  const labelTotal = customLabels.totalDocs;
  const labelTotalPages = customLabels.totalPages;
  const labelHasPrevPage = customLabels.hasPrevPage;
  const labelHasNextPage = customLabels.hasNextPage;
  const labelMeta = customLabels.meta;

  if (Object.prototype.hasOwnProperty.call(options, 'offset')) {
    offset = parseInt(options.offset, 10);
    skip = offset;
  } else if (Object.prototype.hasOwnProperty.call(options, 'page')) {
    page = parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    skip = (page - 1) * limit;
  } else {
    offset = 0;
    page = 1;
    skip = offset;
  }

  if (!pagination) {
    page = 1;
  }

  let countPromise;

  // Only run count when pagination is enabled
  if (pagination) {
    if (forceCountFn === true) {
      // Deprecated since starting from MongoDB Node.JS driver v3.1

      // Hack for mongo < v3.4
      if (Object.keys(collation).length > 0) {
        countPromise = this.countDocuments(query, findOptions)
          .collation(collation)
          .exec();
      } else {
        // Используем estimatedDocumentCount, если query пустой, иначе countDocuments
        if (!query || Object.keys(query).length === 0) {
          countPromise = this.estimatedDocumentCount().exec();
        } else {
          countPromise = this.countDocuments(query).exec();
        }
      }
    } else {
      if (useEstimatedCount === true) {
        countPromise = this.estimatedDocumentCount().exec();
      } else if (typeof useCustomCountFn === 'function') {
        countPromise = useCustomCountFn(query);
      } else {
        // Hack for mongo < v3.4
        if (Object.keys(collation).length > 0) {
          countPromise = this.countDocuments(query, findOptions)
            .collation(collation)
            .exec();
        } else {
          // Используем estimatedDocumentCount, если query пустой, иначе countDocuments
          if (!query || Object.keys(query).length === 0) {
            countPromise = this.estimatedDocumentCount().exec();
          } else {
            countPromise = this.countDocuments(query).exec();
          }
        }
      }
    }
  }

  if (limit) {
    const mQuery = this[customFind](query, projection, findOptions);

    if (populate) {
      mQuery.populate(populate);
    }

    mQuery.select(select);
    mQuery.sort(sort);

    if (lean) {
      // use whit mongoose-lean-virtuals
      if (leanWithVirtuals) {
        mQuery.lean({ virtuals: leanWithVirtuals });
      } else {
        mQuery.lean(lean);
      }
    }

    if (read && read.pref) {
      /**
       * Determines the MongoDB nodes from which to read.
       * @param read.pref one of the listed preference options or aliases
       * @param read.tags optional tags for this query
       */
      mQuery.read(read.pref, read.tags);
    }

    // Hack for mongo < v3.4
    if (Object.keys(collation).length > 0) {
      mQuery.collation(collation);
    }

    if (pagination) {
      mQuery.skip(skip);
      mQuery.limit(limit);
    }

    try {
      if (allowDiskUse === true) {
        mQuery.allowDiskUse();
      }
    } catch (ex) {
      console.error('Your MongoDB version does not support `allowDiskUse`.');
    }

    docsPromise = mQuery.exec();

    if (lean && leanWithId) {
      docsPromise = docsPromise.then((docs) => {
        docs.forEach((doc) => {
          if (doc._id) {
            doc.id = String(doc._id);
          }
        });
        return docs;
      });
    }
  }

  return Promise.all([countPromise, docsPromise])
    .then((values) => {
      let count = values[0];
      const docs = values[1];

      if (pagination !== true) {
        count = docs.length;
      }

      const meta = {
        [labelTotal]: count,
      };

      let result;

      if (typeof offset !== 'undefined') {
        meta.offset = offset;
        page = Math.ceil((offset + 1) / limit);
      }

      const pages = limit > 0 ? Math.ceil(count / limit) || 1 : null;

      // Setting default values
      if (labelLimit) meta[labelLimit] = count;
      if (labelTotalPages) meta[labelTotalPages] = 1;
      if (labelPage) meta[labelPage] = page;
      if (labelPagingCounter) meta[labelPagingCounter] = (page - 1) * limit + 1;

      if (labelHasPrevPage) meta[labelHasPrevPage] = false;
      if (labelHasNextPage) meta[labelHasNextPage] = false;
      if (labelPrevPage) meta[labelPrevPage] = null;
      if (labelNextPage) meta[labelNextPage] = null;

      if (pagination) {
        if (labelLimit) meta[labelLimit] = limit;
        if (labelTotalPages) meta[labelTotalPages] = pages;

        // Set prev page
        if (page > 1) {
          if (labelHasPrevPage) meta[labelHasPrevPage] = true;
          if (labelPrevPage) meta[labelPrevPage] = page - 1;
        } else if (page == 1 && typeof offset !== 'undefined' && offset !== 0) {
          if (labelHasPrevPage) meta[labelHasPrevPage] = true;
          if (labelPrevPage) meta[labelPrevPage] = 1;
        }

        // Set next page
        if (page < pages) {
          if (labelHasNextPage) meta[labelHasNextPage] = true;
          if (labelNextPage) meta[labelNextPage] = page + 1;
        }
      }

      // Remove customLabels set to false
      delete meta['false'];

      if (limit == 0) {
        if (labelLimit) meta[labelLimit] = 0;
        if (labelTotalPages) meta[labelTotalPages] = 1;
        if (labelPage) meta[labelPage] = 1;
        if (labelPagingCounter) meta[labelPagingCounter] = 1;
        if (labelPrevPage) meta[labelPrevPage] = null;
        if (labelNextPage) meta[labelNextPage] = null;
        if (labelHasPrevPage) meta[labelHasPrevPage] = false;
        if (labelHasNextPage) meta[labelHasNextPage] = false;
      }

      if (labelMeta) {
        result = {
          [labelDocs]: docs,
          [labelMeta]: meta,
        };
      } else {
        result = {
          [labelDocs]: docs,
          ...meta,
        };
      }

      return isCallbackSpecified
        ? callback(null, result)
        : Promise.resolve(result);
    })
    .catch((error) => {
      return isCallbackSpecified ? callback(error) : Promise.reject(error);
    });
}

/**
 * @param {Schema} schema
 */
module.exports = (schema) => {
  schema.statics.paginate = paginate;
  schema.statics.paginateSubDocs = paginateSubDocsHelper;
  schema.query.paginate = paginateQueryHelper;
};

module.exports.PaginationParameters = PaginationParametersHelper;
module.exports.paginateSubDocs = paginateSubDocsHelper;
module.exports.paginate = paginate;
