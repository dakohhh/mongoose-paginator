import { FilterQuery, Model, SortOrder, PopulateOptions } from "mongoose";

export interface IPaginateArgs<T> {
  filter?: FilterQuery<T>;
  sort?: Record<string, SortOrder>;
  projection?: string | string[] | Record<string, number | boolean | string | object>
  populate?: PopulateOptions | PopulateOptions[];
  lean?: boolean;
}

export interface IPaginationMeta {
  total: number;
  lastPage: number;
  currentPage: number;
  perPage: number;
  prev: number | null;
  next: number | null;
}

export interface IPaginationResult<T> {
  data: T[];
  meta: IPaginationMeta;
}

export class Paginator<T> {
  private model: Model<T>;
  private page: number;
  private limit: number;
  private args: IPaginateArgs<T>;

  constructor(model: Model<T>, page: number = 1, limit: number = 10, args: IPaginateArgs<T> = { filter: {}, sort: { createdAt: -1 }, lean: true }) {
    this.model = model;
    this.page = page;
    this.limit = limit;
    this.args = args;
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