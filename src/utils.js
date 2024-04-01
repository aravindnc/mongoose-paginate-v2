function getLabels(customLabels = {}) {
  return {
    labelDocs: customLabels.docs,
    labelLimit: customLabels.limit,
    labelNextPage: customLabels.nextPage,
    labelPage: customLabels.page,
    labelPagingCounter: customLabels.pagingCounter,
    labelPrevPage: customLabels.prevPage,
    labelTotal: customLabels.totalDocs,
    labelTotalPages: customLabels.totalPages,
    labelHasPrevPage: customLabels.hasPrevPage,
    labelHasNextPage: customLabels.hasNextPage,
    labelMeta: customLabels.meta,
  };
}

module.exports = { getLabels };
