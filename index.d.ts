declare module 'mongoose' {
  interface CustomLabels<T = string | undefined | boolean> {
    totalDocs?: T;
    docs?: T;
    limit?: T;
    page?: T;
    nextPage?: T;
    prevPage?: T;
    hasNextPage?: T;
    hasPrevPage?: T;
    totalPages?: T;
    pagingCounter?: T;
    meta?: T;
  }

  interface ReadOptions {
    pref: string;
    tags?: any[] | undefined;
  }

  interface PaginateOptions {
    select?: object | string | undefined;
    collation?: import('mongodb').CollationOptions | undefined;
    sort?: object | string | undefined;
    populate?:
    | PopulateOptions[]
    | string[]
    | PopulateOptions
    | string
    | PopulateOptions
    | undefined;
    projection?: any;
    lean?: boolean | undefined;
    leanWithId?: boolean | undefined;
    offset?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    customLabels?: CustomLabels | undefined;
    /* If pagination is set to `false`, it will return all docs without adding limit condition. (Default: `true`) */
    pagination?: boolean | undefined;
    useEstimatedCount?: boolean | undefined;
    useCustomCountFn?: (() => Promise<number>) | undefined;
    forceCountFn?: boolean | undefined;
    allowDiskUse?: boolean | undefined;
    read?: ReadOptions | undefined;
    options?: QueryOptions | undefined;
  }

  interface SubPaginateOptions {
    select?: object | string | undefined;
    populate?:
    | PopulateOptions[]
    | string[]
    | PopulateOptions
    | string
    | PopulateOptions
    | undefined;
    pagination?: boolean | undefined;
    read?: ReadOptions | undefined;
    pagingOptions: SubDocumentPagingOptions | undefined;
  }

  interface SubDocumentPagingOptions {
    populate?:
    | PopulateOptions[]
    | string[]
    | PopulateOptions
    | string
    | PopulateOptions
    | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }

  interface PaginateResult<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    page?: number | undefined;
    totalPages: number;
    offset: number;
    prevPage?: number | null | undefined;
    nextPage?: number | null | undefined;
    pagingCounter: number;
    meta?: any;
    [customLabel: string]: T[] | number | boolean | null | undefined;
  }

  type PaginateDocument<
    T,
    TMethods,
    TVirtuals,
    O extends PaginateOptions = {}
  > = O['lean'] extends true
    ? O['leanWithId'] extends true
    ? LeanDocument<T & { id: string }>
    : LeanDocument<T>
    : HydratedDocument<T, TMethods, TVirtuals>;

  interface PaginateModel<T, TQueryHelpers = {}, TMethods = {}>
    extends Model<T, TQueryHelpers, TMethods> {
    paginate<O extends PaginateOptions>(
      query?: FilterQuery<T>,
      options?: O,
      callback?: (
        err: any,
        result: PaginateResult<PaginateDocument<T, TMethods, O>>
      ) => void
    ): Promise<PaginateResult<PaginateDocument<T, TMethods, O>>>;
  }
}

import mongoose = require('mongoose');
declare function _(schema: mongoose.Schema): void;
export = _;
declare namespace _ {
  const paginate: { options: mongoose.PaginateOptions };
  const paginateSubDocs: { options: mongoose.PaginateOptions };
  class PaginationParameters<T, O extends mongoose.PaginateOptions> {
    constructor(request: { query?: Record<string, any> });
    getOptions: () => O;
    getQuery: () => mongoose.FilterQuery<T>;
    get: () => [mongoose.FilterQuery<T>, O];
  }
}
