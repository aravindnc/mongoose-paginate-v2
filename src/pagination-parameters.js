class PaginationParametersHelper {
  constructor(request) {
    this.request = request;
  }

  /**
   * Yields the "query" parameter for Model.paginate()
   * given any attributes of the Express req.query-Object,
   * */
  getQuery() {
    const filtersQueryParameter = this.request?.query?.query;

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
   *
   * if req.query
   * */
  getOptions() {
    if (!this.request.query) return {};

    const existingOptions = {};
    const page = this.request.query.page;
    const limit = this.request.query.limit;
    const offset = this.request.query.offset;

    if (page) existingOptions['page'] = page;
    if (limit) existingOptions['limit'] = limit;
    if (offset) existingOptions['offset'] = offset;

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

exports.PaginationParameters = PaginationParametersHelper;
