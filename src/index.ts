import { FilterQuery, Model, SortOrder, PopulateOptions, Types } from "mongoose";

export interface IPaginateArgs<T> {
  filter?: FilterQuery<T>;
  sort?: Record<string, SortOrder>;
  projection?: string | string[] | Record<string, number | boolean | string | object>
  populate?: PopulateOptions | PopulateOptions[];
  lean?: boolean;
}

export interface IPaginationMeta {
  total?: number;
  lastPage?: number;
  currentPage?: number;
  perPage?: number;
  prev?: number | null;
  next?: number | null;
  nextCursor?: string | null;
}

export interface IPaginationResult<T> {
  data: T[];
  meta: IPaginationMeta;
}

export interface IBasePaginator<T> {
  model: Model<T>;
  args: IPaginateArgs<T>;
  setArgs: (args: IPaginateArgs<T>) => this;
  paginate: () => Promise<IPaginationResult<T>>;
}

export class BasePaginator<T> implements IBasePaginator<T> {
  model: Model<T>;
  args: IPaginateArgs<T>;

  constructor(model: Model<T>, args: IPaginateArgs<T> = { filter: {}, sort: { createdAt: -1 }, lean: true }) {
    this.model = model;
    this.args = args;
  }

  setArgs(args: IPaginateArgs<T>): this {
    this.args = args;
    return this;
  }

  async paginate(): Promise<IPaginationResult<T>> {
    throw new MongoosePaginatorError('Method not implemented');
  }
}

export class PageNumberPaginator<T> extends BasePaginator<T> {
  private page: number;
  private limit: number;
  constructor(model: Model<T>, page: number = 1, limit: number = 10, args: IPaginateArgs<T> = { filter: {}, sort: { createdAt: -1 }, lean: true }) {
    super(model, args);
    this.page = page;
    this.limit = limit;
  }

  private getSkip(): number {
    return (this.page - 1) * this.limit;
  }

  async paginate(): Promise<IPaginationResult<T>> {
    const skip = this.getSkip();

    const query = this.model
    .find(this.args.filter || {})
    .sort(this.args.sort || { createdAt: -1 })
    .skip(skip)
    .limit(this.limit)
    .populate(this.args.populate || [])
    .select(this.args.projection || {})

    // If the `lean` option is true, apply it to the query
    if (this.args.lean) {
      query.lean();
    }

    const [items, total] = await Promise.all([
      query,
      this.model.countDocuments(this.args.filter || {}),
    ]);

    const lastPage = Math.ceil(total / this.limit);
    const currentPage = this.page;

    return {
      data: items as T[],
      meta: {
        total,
        lastPage,
        currentPage,
        perPage: this.limit,
        prev: currentPage > 1 ? currentPage - 1 : null,
        next: currentPage < lastPage ? currentPage + 1 : null,
      },
    };
  }

  setPage(page: number): this {
    this.page = page;
    return this;
  }

  setLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  setArgs(args: IPaginateArgs<T>): this {
    this.args = args;
    return this;
  }
}


export class OffsetPaginator<T> extends BasePaginator<T> {
  private offset: number;
  private limit: number;
  constructor(model: Model<T>, offset: number, limit: number, args: IPaginateArgs<T> = { filter: {}, sort: {}, lean: true }){
    if (offset % limit !== 0) {
      throw new MongoosePaginatorError(`Offset must be a multiple of limit)`);
    }
    super(model, args)
    this.offset = offset;
    this.limit = limit;
  }

  setOffset(offset: number): this {
    this.offset = offset;
    return this;
  }

  setLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  async paginate(): Promise<IPaginationResult<T>> {
    const query = this.model
      .find(this.args.filter || {})
      .sort(this.args.sort)
      .skip(this.offset)
      .limit(this.limit)
      .populate(this.args.populate || [])
      .select(this.args.projection || {})

    if (this.args.lean) {
      query.lean();
    }

    const [items, total] = await Promise.all([
      query,
      this.model.countDocuments(this.args.filter || {}),
    ]);

    const lastPage = Math.ceil(total / this.limit);
    const currentPage = Math.floor(this.offset / this.limit) + 1;

    return {
      data: items as T[],
      meta: {
        total,
        lastPage,
        currentPage,
        perPage: this.limit,
        prev: currentPage > 1 ? currentPage - 1 : null,
        next: currentPage < lastPage ? currentPage + 1 : null,
      },
    };
  }
}

export class CursorPaginator<T> extends BasePaginator<T> {
  private cursor: string | null;
  private limit: number;
  
  constructor(model: Model<T>, cursor: string | null, limit: number, args: IPaginateArgs<T> = { filter: {}, lean: true }) {
    super(model, args);
    this.cursor = cursor;
    this.limit = limit;
  }

  setCursor(cursor: string): this {
    this.cursor = cursor;
    return this;
  }

  setLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  async paginate(): Promise<IPaginationResult<T>> {
    const filter = { ...this.args.filter };
    
    // Get the sort configuration - default to _id: 1 if not provided
    const sortConfig = this.args.sort || { _id: 1 };
    const sortField = Object.keys(sortConfig)[0]; // Get first sort field
    const sortOrder = Object.values(sortConfig)[0] as 1 | -1; // Get sort direction
    
    if (this.cursor) {
      if (sortField === '_id') {
        // Handle ObjectId cursor
        if (sortOrder === 1) {
          filter._id = { $gt: new Types.ObjectId(this.cursor) };
        } else {
          filter._id = { $lt: new Types.ObjectId(this.cursor) };
        }
      } else {
        // Handle other field types (like Date, Number, String)
        if (sortOrder === 1) {
          filter[sortField] = { $gt: this.cursor };
        } else {
          filter[sortField] = { $lt: this.cursor };
        }
      }
    }

    const query = this.model
      .find(filter)
      .sort(sortConfig) // Use the actual sort configuration
      .limit(this.limit)
      .populate(this.args.populate || [])
      .select(this.args.projection || {});

    if (this.args.lean) {
      query.lean();
    }

    const items = await query;
    const lastItem = items[items.length - 1];

    // Generate cursor based on the sort field
    let nextCursor = null;
    if (lastItem) {
      if (sortField === '_id') {
        nextCursor = String(lastItem._id);
      } else {
        const cursorValue = (lastItem as Record<string, any>)[sortField];
        // Handle Date objects by converting to ISO string
        if (cursorValue instanceof Date) {
          nextCursor = cursorValue.toISOString();
        } else {
          nextCursor = String(cursorValue);
        }
      }
    }

    return {
      data: items as T[],
      meta: {
        nextCursor,
      },
    };
  }
}


export class MongoosePaginatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MongoosePaginatorError';
  }
}


/**
 * @deprecated Please use `PageNumberPaginator` instead. 
 * This will be removed in version 1.1.
 */
const PaginatorDeprecationNotice = PageNumberPaginator;
export { PaginatorDeprecationNotice as Paginator };