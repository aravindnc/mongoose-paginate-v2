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
    // options properties for sub-documents pagination
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

  function populateResult(result, populate) {
    return result.populate(populate);
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

  // options properties for main document query
  const {
    populate,
    read = {},
    select = '',
    pagination = true,
    pagingOptions,
    projection,
  } = options;

  const mQuery = this.findOne(query, projection);

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

        populateResult(result, newPopulate).then((paginatedResult) => {
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

          callback && callback(null, paginatedResult);
          resolve(paginatedResult);
        });
      })
      .catch((err) => {
        console.error(err.message);
        callback && callback(err, null);
        reject(err);
      });
  });
}

module.exports = paginateSubDocs;
