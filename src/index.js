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
 * @param {Boolean}             [options.useEstimatedCount=true] - Enable estimatedDocumentCount for larger datasets. As the name says, the count may not abe accurate.
 * @param {Function}            [options.useCustomCountFn=false] - use custom function for count datasets.
 * @param {Object}              [options.read={}] - Determines the MongoDB nodes from which to read.
 * @param {Function}            [callback]
 *
 * @returns {Promise}
 */
const PaginationParametersHelper = require('./pagination-parameters');

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
  limit: 10,
  projection: {},
  select: '',
  options: {},
  pagination: true,
  useEstimatedCount: false,
  useCustomCountFn: false,
  forceCountFn: false,
  allowDiskUse: false,
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
  } = options;

  const customLabels = {
    ...defaultOptions.customLabels,
    ...options.customLabels,
  };

  let limit = defaultOptions.limit;

  if (pagination) {
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
    page = parseInt(options.page, 10) < 1 ? 1 : parseInt(options.page, 10);
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

  if (forceCountFn === true) {
    // Deprecated since starting from MongoDB Node.JS driver v3.1

    // Hack for mongo < v3.4
    if (Object.keys(collation).length > 0) {
      countPromise = this.count(query).collation(collation).exec();
    } else {
      countPromise = this.count(query).exec();
    }
  } else {
    if (useEstimatedCount === true) {
      countPromise = this.estimatedDocumentCount().exec();
    } else if (typeof useCustomCountFn === 'function') {
      countPromise = useCustomCountFn();
    } else {
      // Hack for mongo < v3.4
      if (Object.keys(collation).length > 0) {
        countPromise = this.countDocuments(query).collation(collation).exec();
      } else {
        countPromise = this.countDocuments(query).exec();
      }
    }
  }

  if (limit) {
    const mQuery = this.find(query, projection, findOptions);

    if (populate) {
      mQuery.populate(populate);
    }

    mQuery.select(select);
    mQuery.sort(sort);
    mQuery.lean(lean);

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
      const [count, docs] = values;
      const meta = {
        [labelTotal]: count,
      };

      let result = {};

      if (typeof offset !== 'undefined') {
        meta.offset = offset;
        page = Math.ceil((offset + 1) / limit);
      }

      const pages = limit > 0 ? Math.ceil(count / limit) || 1 : null;

      // Setting default values
      meta[labelLimit] = count;
      meta[labelTotalPages] = 1;
      meta[labelPage] = page;
      meta[labelPagingCounter] = (page - 1) * limit + 1;

      meta[labelHasPrevPage] = false;
      meta[labelHasNextPage] = false;
      meta[labelPrevPage] = null;
      meta[labelNextPage] = null;

      if (pagination) {
        meta[labelLimit] = limit;
        meta[labelTotalPages] = pages;

        // Set prev page
        if (page > 1) {
          meta[labelHasPrevPage] = true;
          meta[labelPrevPage] = page - 1;
        } else if (page == 1 && typeof offset !== 'undefined' && offset !== 0) {
          meta[labelHasPrevPage] = true;
          meta[labelPrevPage] = 1;
        }

        // Set next page
        if (page < pages) {
          meta[labelHasNextPage] = true;
          meta[labelNextPage] = page + 1;
        }
      }

      // Remove customLabels set to false
      delete meta['false'];

      if (limit == 0) {
        meta[labelLimit] = 0;
        meta[labelTotalPages] = 1;
        meta[labelPage] = 1;
        meta[labelPagingCounter] = 1;
        meta[labelPrevPage] = null;
        meta[labelNextPage] = null;
        meta[labelHasPrevPage] = false;
        meta[labelHasNextPage] = false;
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
 * Pagination process for sub-documents
 * internally, it would call `query.findOne`, return only one document
 *
 * @param {Object} query
 * @param {Object} options
 * @param {Function} callback
 */
function paginateSubDocs(query, options, callback) {
  /**
   * Populate sub documents with pagination fields
   *
   * @param {Object} query
   * @param {Object} populate origin populate option
   * @param {Object} option
   */
  function getSubDocsPopulate(option) {
    /**
     * options properties for sub-documents pagination
     *
     * @param {String} populate: populate option for sub documents
     * @param {Number} page
     * @param {Number} limit
     *
     * @returns {String} countLabel
     */
    let { populate, page = 1, limit = 10 } = option;

    if (!populate) {
      throw new Error('populate is required');
    }

    const offset = (page - 1) * limit;
    option.offset = offset;
    const pagination = {
      skip: offset,
      limit: limit,
    };

    if (typeof populate === 'string') {
      populate = {
        path: populate,
        ...pagination,
      };
    } else if (typeof populate === 'object' && !Array.isArray(populate)) {
      populate = Object.assign(populate, pagination);
    }
    option.populate = populate;

    return populate;
  }

  function populateResult(result, populate, callback) {
    return result.populate(populate, callback);
  }

  /**
   * Convert result of sub-docs list to pagination like docs
   *
   * @param {Object} result query result
   * @param {Object} option pagination option
   */
  function constructDocs(paginatedResult, option) {
    let { populate, offset = 0, page = 1, limit = 10 } = option;

    const path = populate.path;
    const count = option.count;
    const paginatedDocs = paginatedResult[path];

    if (!paginatedDocs) {
      throw new Error(
        `Parse error! Cannot find key on result with path ${path}`
      );
    }

    page = Math.ceil((offset + 1) / limit);

    // set default meta
    const meta = {
      docs: paginatedDocs,
      totalDocs: count || 1,
      limit: limit,
      page: page,
      prevPage: null,
      nextPage: null,
      hasPrevPage: false,
      hasNextPage: false,
    };

    const totalPages = limit > 0 ? Math.ceil(count / limit) || 1 : null;
    meta.totalPages = totalPages;
    meta.pagingCounter = (page - 1) * limit + 1;

    // Set prev page
    if (page > 1) {
      meta.hasPrevPage = true;
      meta.prevPage = page - 1;
    } else if (page == 1 && offset !== 0) {
      meta.hasPrevPage = true;
      meta.prevPage = 1;
    }

    // Set next page
    if (page < totalPages) {
      meta.hasNextPage = true;
      meta.nextPage = page + 1;
    }

    if (limit == 0) {
      meta.limit = 0;
      meta.totalPages = 1;
      meta.page = 1;
      meta.pagingCounter = 1;
    }

    Object.defineProperty(paginatedResult, path, {
      value: meta,
      writable: false,
    });
  }

  options = Object.assign(options, {
    customLabels: defaultOptions.customLabels,
  });

  // options properties for main document query
  const {
    populate,
    read = {},
    select = '',
    pagination = true,
    pagingOptions,
  } = options;

  const mQuery = this.findOne(query, options.projection);

  if (read && read.pref) {
    /**
     * Determines the MongoDB nodes from which to read.
     * @param read.pref one of the listed preference options or aliases
     * @param read.tags optional tags for this query
     */
    mQuery.read(read.pref, read.tags);
  }

  if (select) {
    mQuery.select(select);
  }

  return new Promise((resolve, reject) => {
    mQuery
      .exec()
      .then((result) => {
        let newPopulate = [];

        if (populate) {
          newPopulate.push(newPopulate);
        }

        if (pagination && pagingOptions) {
          if (Array.isArray(pagingOptions)) {
            pagingOptions.forEach((option) => {
              let populate = getSubDocsPopulate(option);
              option.count = result[populate.path].length;
              newPopulate.push(populate);
            });
          } else {
            let populate = getSubDocsPopulate(pagingOptions);
            pagingOptions.count = result[populate.path].length;
            newPopulate.push(populate);
          }
        }

        populateResult(result, newPopulate, (err, paginatedResult) => {
          if (err) {
            callback?.(err, null);
            reject(err);
            return;
          }
          // convert paginatedResult to pagination docs
          if (pagination && pagingOptions) {
            if (Array.isArray(pagingOptions)) {
              pagingOptions.forEach((option) => {
                constructDocs(paginatedResult, option);
              });
            } else {
              constructDocs(paginatedResult, pagingOptions);
            }
          }

          callback?.(null, paginatedResult);
          resolve(paginatedResult);
        });
      })
      .catch((err) => {
        console.error(err.message);
        callback?.(err, null);
      });
  });
}

/**
 * @param {Schema} schema
 */
module.exports = (schema) => {
  schema.statics.paginate = paginate;
  schema.statics.paginateSubDocs = paginateSubDocs;
};

module.exports.PaginationParameters = PaginationParametersHelper;
module.exports.paginate = paginate;
module.exports.paginateSubDocs = paginateSubDocs;
