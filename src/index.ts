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

import { CollationDocument } from 'mongodb';

import mongoose, {
  CallbackError,
  FilterQuery,
  PaginateModel,
  PaginateOptions,
  PaginateResult,
} from 'mongoose';

declare module 'mongoose' {
  interface CustomLabels {
    totalDocs?: string;
    limit?: string;
    page?: string;
    totalPages?: string;
    docs?: string;
    nextPage?: string;
    prevPage?: string;
    pagingCounter?: string;
    hasPrevPage?: string;
    hasNextPage?: string;
    meta?: string;
  }

  interface ReadOptions {
    pref: string;
    tags?: any[];
  }

  interface PaginateOptions {
    select?: object | string;
    sort?: object | string;
    customLabels?: CustomLabels;
    collation?: CollationDocument;
    populate?: string | string[] | PopulateOptions | PopulateOptions[];
    lean?: boolean;
    leanWithId?: boolean;
    offset?: number;
    page?: number;
    limit?: number;
    read?: ReadOptions;
    /* If pagination is set to `false`, it will return all docs without adding limit condition. (Default: `true`) */
    pagination?: boolean;
    projection?: any;
    options?: QueryOptions | undefined;
    useEstimatedCount?: boolean;
    useCustomCountFn?: () => Promise<number>;
    forceCountFn?: boolean;
    allowDiskUse?: boolean;
  }

  interface PaginateResult<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    page?: number | undefined;
    totalPages: number;
    nextPage?: number | null | undefined;
    prevPage?: number | null | undefined;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    meta?: any;
    [customLabel: string]: T[] | number | boolean | null | undefined;
  }

  interface PaginateModel<T> extends Model<T> {
    paginate(
      query?: FilterQuery<T>,
      options?: PaginateOptions,
      callback?: (err: CallbackError, result?: PaginateResult<T>) => void
    ): Promise<PaginateResult<T>>;
  }

  function model<T>(
    name: string,
    schema?: Schema<any>,
    collection?: string,
    skipInit?: boolean
  ): PaginateModel<T>;
}

const defaultOptions: PaginateOptions = {
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
  collation: undefined,
  lean: false,
  leanWithId: true,
  limit: 10,
  projection: {},
  select: '',
  options: {},
  pagination: true,
  useEstimatedCount: false,
  useCustomCountFn: undefined,
  forceCountFn: false,
  allowDiskUse: false,
};

async function paginate<T>(
  query?: FilterQuery<T>,
  options?: PaginateOptions,
  callback?: (err: CallbackError, result?: PaginateResult<T>) => void
): Promise<PaginateResult<T>> {
  const thisTyped = this as PaginateModel<T>;

  options = {
    ...defaultOptions,
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
    limit = Number(options.limit) > 0 ? Number(options.limit) : 0;
  }

  const isCallbackSpecified = typeof callback === 'function';
  const findOptions = options.options;

  let offset: number;
  let page: number;
  let skip: number;

  let docsPromise: Promise<mongoose.EnforceDocument<T, {}>[]> | [] = [];

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
    offset = Number(options.offset);
    skip = offset;
  } else if (Object.prototype.hasOwnProperty.call(options, 'page')) {
    page = Number(options.page) < 1 ? 1 : Number(options.page);
    skip = (page - 1) * limit;
  } else {
    offset = 0;
    page = 1;
    skip = offset;
  }

  if (!pagination) {
    page = 1;
  }

  let countPromise: Promise<number>;

  if (forceCountFn === true) {
    // Deprecated since starting from MongoDB Node.JS driver v3.1

    // Hack for mongo < v3.4
    if (collation && Object.keys(collation).length > 0) {
      countPromise = thisTyped.count(query).collation(collation).exec();
    } else {
      countPromise = thisTyped.count(query).exec();
    }
  } else {
    if (useEstimatedCount === true) {
      countPromise = thisTyped.estimatedDocumentCount().exec();
    } else if (typeof useCustomCountFn === 'function') {
      countPromise = useCustomCountFn();
    } else {
      // Hack for mongo < v3.4
      if (collation && Object.keys(collation).length > 0) {
        countPromise = thisTyped
          .countDocuments(query)
          .collation(collation)
          .exec();
      } else {
        countPromise = thisTyped.countDocuments(query).exec();
      }
    }
  }

  if (limit) {
    const mQuery = thisTyped.find(query, projection, findOptions);

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
    if (collation && Object.keys(collation).length > 0) {
      mQuery.collation(collation);
    }

    if (pagination) {
      mQuery.skip(skip);
      mQuery.limit(limit);
    }

    try {
      if (allowDiskUse === true) {
        (mQuery as any).allowDiskUse();
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

  try {
    const [count, docs] = await Promise.all([countPromise, docsPromise]);

    const meta: {
      [x: string]: any;
    } = {
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

    const finalResult: PaginateResult<T> = result as PaginateResult<T>;

    isCallbackSpecified && callback(null, finalResult);
    return Promise.resolve(finalResult);
  } catch (error) {
    isCallbackSpecified && callback(error);
    return Promise.reject(error);
  }
}

/**
 * @param {Schema} schema
 */
export default <T>(schema: mongoose.Schema<T>): void => {
  schema.statics.paginate = paginate;
};
