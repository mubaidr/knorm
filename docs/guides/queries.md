# Queries

For all database operations that [Model](/api.md#model) performs, the
[Query](/api.md#query) class does all the heavy lifting. It transforms
JavaScript function calls into SQL and parses the data from the database into
Model instances.

## Query config

Queries are configured through these properties:

| Property              | Type     | Default                                         | Description                                                                                                                                                                                                            |
| --------------------- | -------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Query.prototype.sql` | function | [sql-bricks](https://csnw.github.io/sql-bricks) | The function used to generate SQL. This allows plugins to add more features for example with [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres), which is what [@knorm/postgres](knorm-postgres) does. |

## Initializing queries

Assuming this ORM:

```js
const knorm = require('@knorm/knorm');
const { Model, Query } = knorm();

class User extends Model {}
User.table = 'user';
User.fields = { id: { type: 'integer', primary: true }, names: 'string' };
```

You can initialise query instances with the
[Model.query](/api.md#model-query-query) getter:

```js
const query = User.query;
```

::: warning NOTE
Query instances are not reusable! That is, you cannot use a query instance for
one operation e.g. a fetch and then reuse it for another e.g. an insert.
However, cloning query instances is supported via
[query.clone](/api.md#query-clone-%E2%87%92-query).
:::

## Running queries

Similar to [Model](/api.md#model), you can save, retrieve or delete data in
the database with the same CRUD methods:

```js
// either insert or update (if the instance has a primary field-value set):
User.query.save(data, options);

// or directly call:
User.query.insert(data, options);
User.query.update(data, options);

// fetch or re-fetch:
User.query.fetch(options);

// delete:
User.query.delete(options);
```

> See [query.save](/api.md#query-save-options-%E2%87%92-promise),
> [query.insert](/api.md#query-insert-options-%E2%87%92-promise),
> [query.update](/api.md#query-update-options-%E2%87%92-promise),
> [query.fetch](/api.md#query-fetch-options-%E2%87%92-promise) and
> [query.delete](/api.md#query-delete-options-%E2%87%92-promise) for more
> info

::: warning NOTE
The Query CRUD methods operate on multiple rows (similar to the Model statics).
Only [update](/api.md#query-update-data-options-%E2%87%92-promise)
behaves differently when passed an object with the primary field-value set:
:::

```js
User.query.update({ names: 'foo' }); // updates all rows
User.query.update({ id: 1, names: 'foo' }); // updates only the row with id 1
```

## Running raw queries

Raw queries can be run by directly invoking the
[execute](api.md#query-execute-sql-%E2%87%92-promise) method:

```js
const rows = await User.query.execute('select now()');
```

To run queries with parameter bindings, you may use the
[sql](/api.md#query-sql-sqlbricks) helper to construct an
[sql-bricks](https://csnw.github.io/sql-bricks/) instance:

```js
const query = User.query;
const sqlBricks = query.sql;
const sql = sqlBricks.select(
  sqlBricks('select * from "user" where id = $1 and names = $2', [1, 'foo'])
);
const rows = await query.execute(sql);
```

::: tip
with the [@knorm/postgres](https://github.com/knorm/postgres) plugin loaded,
then `Query.prototype.sql` is overridden with
[sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres)
:::

Alternatively, you can pass an object with `text` and `values` properties:

```js
const rows = await User.query.execute({
  text: 'select * from "user" where id = $1 and names = $2',
  values: [1, 'foo']
});
```

## Setting options

Options can be set by calling methods:

```js
User.query
  .where({ names: 'foo' }) // names matching 'foo'
  .first() // return the first object instead of an array
  .require() // throw and error if no row is not found
  .fetch();
```

Or by passing an `options` object to a CRUD method:

```js
User.query.fetch({
  where: { names: 'foo' },
  first: true,
  require: true
});
```

Which is a proxy to [query.setOptions](/api.md#query-setoptions-options-%E2%87%92-query):

```js
User.query
  .setOptions({
    where: { names: 'foo' },
    first: true,
    require: true
  })
  .fetch();
```

::: tip INFO
Until v2 of @knorm/knorm, the object notation only works for options that take
one argument (majority)
:::

For most query options, calling the same option does not overwrite the previous
value but instead appends to it. However, for boolean-value options, setting the
same option overwrites the previous value:

```js
User.query
  .where({ id: 1 })
  .fields(['id'])
  .require(false)
  .setOptions({
    where: { names: 'foo' }, // `where` is now `{ id: 1, names: 'foo' }`
    fields: ['name'], // `fields` are now `[ 'id', 'name' ]`
    require: true  // `require` is now `true`
  })
  .fetch({
    require: false  // `require` will eventually be `false`
  });
```

You can set default query options per model via the
[Model.options](/api.md#model-options-object) setter:

```js
User.options = {
  query: { fields: ['id'] }
};

User.fetch(); // instances returned will only contain the `id` field
```

## Where expressions

To create more complicated `where` queries, use where expressions:

```js
User.query
  .where(
    User.where.and(
      User.where.in('id', [1, 2, 3]),
      User.where.like({ foo: '%foo%' }),
      User.where.or(
        User.where.notEqual({ id: 4 }),
        User.where.not(User.where.between({ id: [10, 20] }))
      )
    )
  )
  .fetch();
```

These are similar to the [sql-bricks](https://csnw.github.io/sql-bricks/) where
expressions, with some added features:

* Support for objects in all where expressions e.g. `User.where.in({ id: [1, 2] })`
* Support for `between` with an array e.g. `User.where.between({ id: [10, 20] })`
* Additional full length aliases for all the sql-bricks' where expressions:

| sql-bricks' method | knorm's method | knorm's additional alias |
| ------------------ | -------------- | ------------------------ |
| and                | and            | -                        |
| or                 | or             | -                        |
| not                | not            | -                        |
| eq                 | eq             | equal                    |
| notEq              | notEq          | notEqual                 |
| lt                 | lt             | lessThan                 |
| lte                | lte            | lessThanOrEqual          |
| gt                 | gt             | greaterThan              |
| gte                | gte            | greaterThanOrEqual       |
| between            | between        | -                        |
| isNull             | isNull         | -                        |
| isNotNull          | isNotNull      | -                        |
| like               | like           | -                        |
| exists             | exists         | -                        |
| in                 | in             | -                        |
| eqAll              | eqAll          | equalAll                 |
| notEqAll           | notEqAll       | notEqualAll              |
| ltAll              | ltAll          | lessThanAll              |
| lteAll             | lteAll         | lessThanOrEqualAll       |
| gtAll              | gtAll          | greaterThanAll           |
| gteAll             | gteAll         | greaterThanOrEqualAll    |
| eqAny              | eqAny          | equalAny                 |
| notEqAny           | notEqAny       | notEqualAny              |
| ltAny              | ltAny          | lessThanAny              |
| lteAny             | lteAny         | lessThanOrEqualAny       |
| gtAny              | gtAny          | greaterThanAny           |
| gteAny             | gteAny         | greaterThanOrEqualAny    |
| eqSome             | eqSome         | equalSome                |
| notEqSome          | notEqSome      | notEqualSome             |
| ltSome             | ltSome         | lessThanSome             |
| lteSome            | lteSome        | lessThanOrEqualSome      |
| gtSome             | gtSome         | greaterThanSome          |
| gteSome            | gteSome        | greaterThanOrEqualSome   |

## Query errors

In case of any failures, the CRUD methods reject their promises with a custom
error that wraps the error thrown by the database driver:

```js
User.query.insert({ id: 1 });
User.query.insert({ id: 1 });
// => User.InsertError(new Error('duplicate primary key error'));
```

In addition, if the [require](/api.md#query-require-require-%E2%87%92-query)
option is set to `true` on a query and no rows are
inserted/updated/fetched/deleted, then the promise is rejected with a
[Query.NoRowsError](/api.md#query-norowserror):

```js
User.query
  .require()
  .where({ names: 'does not exist' })
  .fetch();
// => User.NoRowsFetchedError();
User.query
  .require()
  .where({ names: 'does not exist' })
  .update({ names: 'foo' });
// => User.NoRowsUpdatedError();
```

> See the [Query](/api.md#query) docs for more info on all the query errors

## Query life-cycle

Database connections are created lazily; that is, connections are not created
until a database operation is called (e.g a
[fetch](/api.md#query-fetch-options-%E2%87%92-promise)). When a database
operation is started, the following [Query](/api.md#query) methods are called:

* **[Query.prototype.execute](/api.md#query-execute-sql-%E2%87%92-promise)**:
  handles the entire query life-cycle
* **[Query.prototype.connect](/api.md#query-connect-%E2%87%92-promise)**:
  creates a connection to the database, via [Connection.prototype.create](/api.md#connection-create-%E2%87%92-promise).
* **[Query.prototype.formatSql](/api.md#query-formatsql-sql-%E2%87%92-object)**:
  formats the SQL to be run. If multiple queries are to be run, this is called
  to format each of them.
* **[Query.prototype.query](/api.md#query-query-sql-%E2%87%92-promise)**: runs
  the SQL against the database, via
  [Connection.prototype.query](/api.md#connection-query-sql-%E2%87%92-promise).
  If multiple queries are to be run, this is called to run each of them.
* **[Query.prototype.disconnect](/api.md#query-disconnect-%E2%87%92-promise)**:
  closes the connection to the database, via [Connection.prototype.close](/api.md#connection-close-%E2%87%92-promise).

::: tip INFO
When multiple queries are run, they are run in parallel and the rows returned
from each are merged into a single array that is resolved from
[Query.prototype.execute](/api.md#query-execute-sql-%E2%87%92-promise).
:::

When queries are run within transactions,
[Query.prototype.connect](/api.md#query-connect-%E2%87%92-promise) and
[Query.prototype.disconnect](/api.md#query-disconnect-%E2%87%92-promise) are
overriden to ensure only a single connection is used for all the queries. In
this case
[Transaction.prototype.connect](/api.md#transaction-connect-%E2%87%92-promise)
and
[Transaction.prototype.disconnect](/api.md#transaction-disconnect-%E2%87%92-promise)
control the connection handling.
[Transaction.prototype.connect](/api.md#transaction-connect-%E2%87%92-promise)
is only called once the first
[Query.prototype.connect](/api.md#query-connect-%E2%87%92-promise) is called.
