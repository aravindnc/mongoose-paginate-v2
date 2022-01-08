class PaginationParametersHelper {
  constructor(request) {
    this.query = request.query;
  }

  /**
   * @param {string} option
   * @return {boolean}
   * */
  getBooleanOption(option) {
    return option === 'true';
  }

  /**
   * @param {object|string} option
   * @return {object|string}
   * */
  getOptionObjectOrString(option) {
    try {
      return JSON.parse(option);
    } catch (err) {
      return {};
    }
  }

  /**
   * @param {string} option
   * @return {number}
   * */
  getIntegerOption(option) {
    return Number(option);
  }

  /**
   * Yields the "query" parameter for Model.paginate()
   * given any attributes of the Express req.query-Object,
   * */
  getQuery() {
    const filtersQueryParameter = this.query?.query;

    if (!filtersQueryParameter) return {};

    try {
      return JSON.parse(filtersQueryParameter);
    } catch (err) {
      return {};
    }
  }

  /**
   * Yields the "options" parameter for Model.paginate(),
   * given any attributes of the Express req.query-Object
   * */
  getOptions() {
    if (!this.query) return {};

    const existingOptions = {};

    if (this.query.select)
      existingOptions['select'] = this.getOptionObjectOrString(
        this.query.select
      );
    if (this.query.collation)
      existingOptions['collation'] = this.getOptionObjectOrString(
        this.query.collation
      );
    if (this.query.sort)
      existingOptions['sort'] = this.getOptionObjectOrString(this.query.sort);
    if (this.query.populate)
      existingOptions['populate'] = this.getOptionObjectOrString(
        this.query.populate
      );
    if (this.query.projection)
      existingOptions['projection'] = this.getOptionObjectOrString(
        this.query.projection
      );
    if (this.query.lean)
      existingOptions['lean'] = this.getBooleanOption(this.query.lean);
    if (this.query.leanWithId)
      existingOptions['leanWithId'] = this.getBooleanOption(
        this.query.leanWithId
      );
    if (this.query.offset)
      existingOptions['offset'] = Number(this.query.offset);
    if (this.query.page) existingOptions['page'] = Number(this.query.page);
    if (this.query.limit) existingOptions['limit'] = Number(this.query.limit);
    if (this.query.customLabels)
      existingOptions['customLabels'] = JSON.parse(this.query.customLabels);
    if (this.query.pagination)
      existingOptions['pagination'] = this.getBooleanOption(
        this.query.pagination
      );
    if (this.query.useEstimatedCount)
      existingOptions['useEstimatedCount'] = this.getBooleanOption(
        this.query.useEstimatedCount
      );
    if (this.query.useCustomCountFn)
      existingOptions['useCustomCountFn'] = this.getBooleanOption(
        this.query.useCustomCountFn
      );
    if (this.query.forceCountFn)
      existingOptions['forceCountFn'] = this.getBooleanOption(
        this.query.forceCountFn
      );
    if (this.query.allowDiskUse)
      existingOptions['allowDiskUse'] = this.getBooleanOption(
        this.query.allowDiskUse
      );
    if (this.query.read) existingOptions['read'] = JSON.parse(this.query.read);
    if (this.query.options)
      existingOptions['options'] = JSON.parse(this.query.options);

    return existingOptions;
  }

  /**
   * Yields an array with positions:
   * [0] "query" parameter, for Model.paginate()
   * [1] "options" parameter, for Model.paginate()
   * */
  get() {
    return [{ ...this.getQuery() }, { ...this.getOptions() }];
  }
}

module.exports = PaginationParametersHelper;
