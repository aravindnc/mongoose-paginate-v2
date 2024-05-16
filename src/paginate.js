const { defaultOptions } = require('./default-options');
const { getLabels } = require('./utils');

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
  const {
    labelDocs,
    labelLimit,
    labelNextPage,
    labelPage,
    labelPagingCounter,
    labelPrevPage,
    labelTotal,
    labelTotalPages,
    labelHasPrevPage,
    labelHasNextPage,
    labelMeta,
  } = getLabels(customLabels);

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
        countPromise = this.countDocuments(query).collation(collation).exec();
      } else {
        countPromise = this.countDocuments(query).exec();
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
  }

  if (limit) {
    const mQuery = this[customFind](query, projection, findOptions);

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
      let count = values[0];
      const docs = values[1];

      if (pagination !== true) {
        count = docs.length;
      }

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

module.exports = { paginate };
