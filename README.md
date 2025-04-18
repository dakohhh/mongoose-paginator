# @dakohhh/mongoose-paginator

[![npm version](https://img.shields.io/npm/v/@dakohhh/mongoose-paginator.svg)](https://www.npmjs.com/package/@dakohhh/mongoose-paginator)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A lightweight, flexible, and TypeScript-friendly pagination utility for Mongoose models. This package provides a class-based approach to handling database pagination with support for filtering, sorting, population, projection, and metadata customization — all without relying on heavy plugins.

## Features

- 🚀 **Lightweight & Performant**: Minimal overhead with optimized query execution
- 🔧 **Fully Configurable**: Customize filters, sorting, projections, and more
- 📊 **Rich Metadata**: Comprehensive pagination metadata including total count, page info, and navigation
- 🧩 **Fluent API**: Chainable methods for a clean and intuitive interface
- 📝 **TypeScript Support**: Full type safety with generic typing
- 🔄 **Document/JSON Flexibility**: Support for both Mongoose documents and lean objects
- 🔍 **Advanced Querying**: Compatible with all Mongoose query operators
- 🧪 **Zero Dependencies**: No external dependencies beyond Mongoose

## Installation

```bash
npm install @dakohhh/mongoose-paginator
```

Or with yarn:

```bash
yarn add @dakohhh/mongoose-paginator
```

## Usage

> **⚠️ Deprecation Notice:**
> 
> The `Paginator` class has been **deprecated** and will be removed in a future release. Please use the `PageNumberPaginator` class instead. `PageNumberPaginator` is functionally identical to `Paginator` and is now the recommended way to perform page-number-based pagination.
> 
> ```typescript
> import { PageNumberPaginator } from '@dakohhh/mongoose-paginator';
> // Usage is identical to the old Paginator class.
> ```

### Basic Example

```typescript
import { Paginator } from '@dakohhh/mongoose-paginator';
import { model, Schema, Document } from 'mongoose';

// Define your Mongoose model
interface IUser extends Document {
  name: string;
  email: string;
  age: number;
  createdAt: Date;
}

const UserModel = model<IUser>('User', userSchema);

// Create a paginator instance
const paginator = new Paginator<IUser>(UserModel);

// Execute pagination
const result = await paginator.paginate();

console.log(result);
// Output: { data: [...], meta: { total, lastPage, currentPage, perPage, prev, next } }

// You can also destructure the results for cleaner code
const { data: users, meta: paginationInfo } = await paginator.paginate();
console.log(users); // Array of user documents
console.log(paginationInfo); // Pagination metadata
```

### Advanced Usage

#### Page Number Pagination (Recommended)

```typescript
import { PageNumberPaginator } from '@dakohhh/mongoose-paginator';

const paginator = new PageNumberPaginator<IUser>(UserModel, 1, 10, {
  filter: { age: { $gte: 18 } },
  sort: { createdAt: -1 },
  projection: ['name', 'email', '-_id'],
  populate: [{ path: 'posts', select: 'title' }],
  lean: true
});

const result = await paginator.paginate();
console.log(result);
// {
//   data: [...],
//   meta: { total, lastPage, currentPage, perPage, prev, next }
// }
```

#### Offset Pagination

Offset-based pagination is useful for traditional skip-limit pagination scenarios.

```typescript
import { OffsetPaginator } from '@dakohhh/mongoose-paginator';

const offset = 0; // Start offset
const limit = 10; // Items per page
const paginator = new OffsetPaginator<IUser>(UserModel, offset, limit, {
  filter: { age: { $gte: 18 } },
  sort: { createdAt: -1 },
  projection: ['name', 'email', '-_id'],
  populate: [{ path: 'posts', select: 'title' }],
  lean: true
});

const result = await paginator.paginate();
console.log(result);
// {
//   data: [...],
//   meta: { total, lastPage, currentPage, perPage, prev, next }
// }
```

#### Cursor Pagination

Cursor-based pagination is ideal for real-time feeds or infinite scrolling. Use the `nextCursor` from the previous result to fetch the next page.

```typescript
import { CursorPaginator } from '@dakohhh/mongoose-paginator';

let cursor: string | null = null;
const limit = 10;
const paginator = new CursorPaginator<IUser>(UserModel, cursor, limit, {
  filter: { age: { $gte: 18 } },
  projection: ['name', 'email', '-_id'],
  populate: [{ path: 'posts', select: 'title' }],
  lean: true
});

const result = await paginator.paginate();
console.log(result);
// {
//   data: [...],
//   meta: { nextCursor }
// }

// To fetch the next page:
cursor = result.meta.nextCursor;
const nextPage = await new CursorPaginator<IUser>(UserModel, cursor, limit).paginate();
```

---

### Result Customization

One of the key advantages of this paginator is the ability to easily customize how you access your results through destructuring:

```typescript
// Standard result object
const result = await paginator.paginate();

// Customize variable names through destructuring
const { data: users, meta: paginationInfo } = await paginator.paginate();

// Access your data with your preferred variable names
console.log(users); // Your paginated documents with your custom name
console.log(paginationInfo.currentPage); // Access pagination metadata with your custom name

// Use in a response object
return {
  success: true,
  users, // Your renamed data array
  pagination: paginationInfo // Your renamed metadata
};
```

## API Reference

### `Paginator<T>`

The main class for pagination operations.

#### Constructor

```typescript
constructor(
  model: Model<T>,
  page: number = 1,
  limit: number = 10,
  args: IPaginateArgs<T> = { filter: {}, sort: { createdAt: -1 }, lean: true }
)
```

#### Methods

- **`paginate()`**: Executes the pagination query and returns results with metadata
- **`setPage(page: number)`**: Sets the current page number
- **`setLimit(limit: number)`**: Sets the number of items per page
- **`setArgs(args: IPaginateArgs<T>)`**: Sets the query arguments

### Interfaces

#### `IPaginateArgs<T>`

```typescript
interface IPaginateArgs<T> {
  filter?: FilterQuery<T>;
  sort?: Record<string, SortOrder>;
  projection?: string | string[] | Record<string, number | boolean | string | object>;
  populate?: PopulateOptions | PopulateOptions[];
  lean?: boolean;
}
```

#### `IPaginationResult<T>`

```typescript
interface IPaginationResult<T> {
  data: T[];
  meta: IPaginationMeta;
}
```

#### `IPaginationMeta`

```typescript
interface IPaginationMeta {
  total: number;
  lastPage: number;
  currentPage: number;
  perPage: number;
  prev: number | null;
  next: number | null;
}
```

## Advantages Over Other Solutions

- **Class-Based Design**: Unlike function-based pagination utilities, our class-based approach allows for a more intuitive and chainable API.

- **TypeScript First**: Built with TypeScript from the ground up, providing complete type safety without compromising on features.

- **Lightweight**: No external dependencies beyond Mongoose itself, making it a lightweight addition to your project.

- **Flexible Query Options**: Full support for all Mongoose query capabilities including complex filtering, sorting, and population.

- **Performance Optimized**: Uses `Promise.all` to run document fetching and count queries in parallel for better performance.

- **Lean Option**: Built-in support for lean queries, significantly improving performance when working with large datasets.

- **Comprehensive Metadata**: Provides rich pagination metadata including total count, current page, last page, and navigation helpers.

- **Fluent API**: Chainable methods make the API intuitive and easy to use, improving code readability.

## Use Cases

- **RESTful APIs**: Implement standardized pagination for your API endpoints
- **Admin Dashboards**: Paginate large datasets in admin interfaces
- **Data Tables**: Power data tables with server-side pagination
- **Search Results**: Paginate search results efficiently
- **Feed Systems**: Implement "load more" or paginated content feeds


## 🔄 Comparison: `@dakohhh/mongoose-paginator` vs `mongoose-paginate-v2`

| Feature                  | @dakohhh/mongoose-paginator                                                                 | mongoose-paginate-v2                                |
|--------------------------|---------------------------------------------------------------------------------------------|-----------------------------------------------------|
| 🏗️ Architecture          | Class-based with fluent, chainable methods                                                  | Plugin-based (requires schema.plugin)               |
| ✅ TypeScript Support     | ✅ First-class TypeScript support with full generic typing                                  | ⚠️ Partial — requires community types                |
| 🧩 Integration            | No schema modification needed — use directly with any Mongoose model                       | Requires modification via schema.plugin             |
| 🚀 Performance            | Parallel execution of data & count queries using `Promise.all()`                           | Serial execution (slightly slower on large queries) |
| 🧠 Query Options          | Advanced support: filtering, sorting, projection, population, lean queries                 | Basic support for filter, select, populate, lean    |
| 📊 Pagination Metadata    | Rich meta: total, perPage, currentPage, prev, next, lastPage                               | Provides basic pagination metadata                  |
| 🔄 Chainable API          | ✅ Fluent API: `.setPage().setLimit().setArgs()`                                            | ❌ Not supported                                     |
| 🧼 Clean API              | Supports destructuring (`const { data, meta } = ...`)                                      | Partially supported                                 |
| 🧪 Testability            | Easily testable: no schema mutation, class-based structure                                 | Harder to mock due to schema plugin requirement     |
| ⚙️ Projection Support     | ✅ Yes                                                                                      | ✅ Yes                                               |
| 🔌 Populate Support       | ✅ Yes                                                                                      | ✅ Yes                                               |
| 💬 Lean Document Support  | ✅ Yes                                                                                      | ✅ Yes                                               |
| 📦 Dependencies           | Zero dependencies beyond Mongoose                                                          | Depends on Mongoose and plugin structure            |
| 🧠 Learning Curve         | Slightly higher (class-based, customizable)                                                | Very beginner-friendly                              |
| 📚 Community              | New and growing                                                                             | Large and established                               |
| 🔐 Schema Safety          | Does not modify original schema                                                             | Alters schema with plugin                           |

---

## License

ISC

## Author

Wisdom Dakoh

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
