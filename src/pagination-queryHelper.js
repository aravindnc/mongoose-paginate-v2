/**
 * Helper function to paginate a query.
 *
 * @param {Object} options - The pagination options.
 * @returns {Promise} - A promise that resolves to the paginated query result.
 */
function paginateQueryHelper(options) {
  return this.model.paginate(this.getQuery(), options);
}

module.exports = paginateQueryHelper;
