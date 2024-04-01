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
const paginateSubDocsHelper = require('./pagination-subdocs');
const { paginate } = require('./paginate');

/**
 * @param {Schema} schema
 */
module.exports = (schema) => {
  schema.statics.paginate = paginate;
  schema.statics.paginateSubDocs = paginateSubDocsHelper;
};

module.exports.PaginationParameters = PaginationParametersHelper;
module.exports.paginateSubDocs = paginateSubDocsHelper;
module.exports.paginate = paginate;
