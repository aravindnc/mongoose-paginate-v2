var Promise = require('bluebird');

/**
 * @param {Object}              [query={}]
 * @param {Object}              [options={}]
 * @param {Object|String}         [options.select]
 * @param {Object|String}         [options.sort]
 * @param {Object|String}         [options.customLabels]
 * @param {Object|}               [options.collation]
 * @param {Array|Object|String}   [options.populate]
 * @param {Boolean}               [options.lean=false]
 * @param {Boolean}               [options.leanWithId=true]
 * @param {Number}                [options.offset=0] - Use offset or page to set skip position
 * @param {Number}                [options.page=1]
 * @param {Number}                [options.limit=10]
 * @param {Function}            [callback]
 *
 * @returns {Promise}
 */
function paginate(query, options, callback) {
    query   = query || {};
    options = Object.assign({}, paginate.options, options);
    options.customLabels = options.customLabels ? options.customLabels : {};

    var select     = options.select;
    var sort       = options.sort;
    var collation  = options.collation;
    var populate   = options.populate;
    var lean       = options.lean || false;
    var leanWithId = options.hasOwnProperty('leanWithId') ? options.leanWithId : true;

    var limit = options.hasOwnProperty('limit') ? options.limit : 10;
    var skip, offset, page;

    // Custom Labels
    var labelTotal = options.customLabels.totalDocs ? options.customLabels.totalDocs : 'totalDocs';
    var labelLimit = options.customLabels.limit ? options.customLabels.limit : 'limit';
    var labelPage = options.customLabels.page ? options.customLabels.page : 'page';
    var labelTotalPages = options.customLabels.totalPages ? options.customLabels.totalPages : 'totalPages';
    var labelDocs = options.customLabels.docs ? options.customLabels.docs : 'docs';
    var labelNextPage = options.customLabels.nextPage ? options.customLabels.nextPage : 'nextPage';
    var labelPrevPage = options.customLabels.prevPage ? options.customLabels.prevPage : 'prevPage';

    if (options.hasOwnProperty('offset')) {
        offset = options.offset;
        skip   = offset;
    } else if (options.hasOwnProperty('page')) {
        page = options.page;
        skip = (page - 1) * limit;
    } else {
        offset = 0;
        page   = 1;
        skip   = offset;
    }

    var promises = {
        docs:  Promise.resolve([]),
        count: this.countDocuments(query).exec()
    };

    if (limit) {
        var query = this.find(query)
                        .select(select)
                        .sort(sort)
                        .collation(collation)
                        .skip(skip)
                        .limit(limit)
                        .lean(lean);

        if (populate) {
            [].concat(populate).forEach(function(item) {
                query.populate(item);
            });
        }

        promises.docs = query.exec();

        if (lean && leanWithId) {
            promises.docs = promises.docs.then(function(docs) {
                docs.forEach(function(doc) {
                    doc.id = String(doc._id);
                });

                return docs;
            });
        }
    }

    return Promise.props(promises)
        .then(function(data) {
            var result = {
                [labelDocs]:  data.docs,
                [labelTotal]: data.count,
                limit: limit
            };

            if (offset !== undefined) {
                result.offset = offset;
            }

            if (page !== undefined) {

                const pages = Math.ceil(data.count / limit) || 1;

                result.hasPrevPage = false;
                result.hasNextPage = false;

                result[labelPage]  = page;
                result[labelTotalPages] = pages;
                             
                // Set prev page
                if(page > 1) {
                    result.hasPrevPage = true;
                    result[labelPrevPage] = (page - 1);                    
                } else {
                    result[labelPrevPage] = null;
                }

                // Set next page
                if(page < pages) {
                    result.hasNextPage = true;
                    result[labelNextPage] = (page + 1);
                } else {
                    result[labelNextPage] = null;
                }
            }

            return result;
        })
        .asCallback(callback);
}

/**
 * @param {Schema} schema
 */
module.exports = function(schema) {
    schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;
