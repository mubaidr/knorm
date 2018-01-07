# Fields

Model fields are synonymous to table columns. To add fields to a model, assign
an object to [Model.fields](api/model.md#modelfields):

```js
class User extends Model {}
User.fields = { fieldName: fieldConfig };
```

You can also use a getter function to return the models fields, but first add
the fields to the model's config to ensure they are linked to the model and that
[field inheritance](#field-inheritance) is maintained:

```js
class User extends Model {
  static get fields {
    this.config.fields = { fieldName: fieldConfig };
    return this.config.fields;
  }
}
```

Knorm uses field names as column names when running queries. To transform field
names to different column names (e.g. snake-casing), use a `fieldToColumn`
mapping function (ref. [Knorm options](api/knorm.md#options)) or specify a
different `column` name per field with the [field config](#field-config).

## Field config

These config options are supported:

| Option       | Type                  | Default        | Description                                                                                                                                                                              |
| ------------ | --------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`       | string (**required**) | none           | See [field types](#field-types).                                                                                                                                                         |
| `default`    | any / function        | none           | A default value to use during insert operations if the field has no value. If configured as a function, it will be called with `this` set to the model instance.                         |
| `column`     | string                | the field name | The column name to use for this field during database operations. **NOTE:** this takes precedence over the value returned by the `fieldToColumn` mapping function.                       |
| `primary`    | boolean               | `false`        | Whether or not the field is the primary field. **NOTE:** a model can only have one primary field, any subsequent primary fields will overwrite the existing one (also in child models).  |
| `unique`     | boolean               | `false`        | Whether or not the field is a unique field. Primary and unique fields are used for instance operations i.e. fetch, update, delete etc                                                    |
| `methods`    | boolean               | `false`        | If either `primary` or `unique` is `true`, this specifies whether or not to add `fetchByField`, `updateByField` and `deleteByField` static methods to the model.                         |
| `updated`    | boolean               | `true`         | Whether or not this field should be included in the data to be updated during update operations. Intended for use with unique and primary fields.                                        |
| `references` | Field                 | none           | A field that this field references (indicating that this field is a foreign field). Used for [relations](guides/relations.md#relations).                                                 |
| `cast`       | Object                | none           | An object with `forSave` or `forFetch` (or both) functions that are called with the field value to cast it to something else before save (insert and update) and after fetch operations. |
| Validators:  |                       |                |                                                                                                                                                                                          |
| `type`       | string                | none           | The field type is also used as a validator.                                                                                                                                              |
| `required`   | boolean               | `false`        | Validates that the field value is neither `undefined` nor `null`.                                                                                                                        |
| `minLength`  | integer               | none           | Validates that the field value's `length` is at least as long as this value. Supported only for `string`, `text` and `jsonArray` (for [JSON validation](#json-validation)) field types.  |
| `maxLength`  | integer               | none           | Validates that the field value's `length` is not longer than this value. Supported only for `string`, `text` and `jsonArray` (for [JSON validation](#json-validation)) field types.      |
| `oneOf`      | array                 | none           | Validates that the field value is one of the values in this array. Uses strict equality and case-sensitive matching for strings.                                                         |
| `equals`     | mixed                 | none           | Validates that the field value is equal to this value. Uses strict equality and case-sensitive matching for strings.                                                                     |
| `regex`      | RegExp                | none           | Validates that the field value [matches](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test) this regex.                                       |
| `validate`   | function              | none           | See [custom validation](guides/validation.md#custom-validation)                                                                                                                          |
| `schema`     | object                | none           | See [JSON validation](guides/validation.md#json-validation)                                                                                                                              |

## Field types

These field types are supported:

| Type          | Description                                                       | Validator                                                                 |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `text`        | Knex's [text](http://knexjs.org/#Schema-text) schema type         | `typeof value === 'string'`                                               |
| `uuid`        | Knex's [uuid](http://knexjs.org/#Schema-uuid) schema type         | [validator.isUUID](https://www.npmjs.com/package/validator#validators)    |
| `binary`      | Knex's [binary](http://knexjs.org/#Schema-binary) schema type     | `value instanceof Buffer`                                                 |
| `decimal`     | Knex's [decimal](http://knexjs.org/#Schema-decimal) schema type   | [validator.isDecimal](https://www.npmjs.com/package/validator#validators) |
| `string`      | Knex's [string](http://knexjs.org/#Schema-string) schema type     | `typeof value === 'string'`                                               |
| `boolean`     | Knex's [boolean](http://knexjs.org/#Schema-boolean) schema type   | `typeof value === 'boolean'`                                              |
| `integer`     | Knex's [integer](http://knexjs.org/#Schema-integer) schema type   | `Number.isInteger(value)`                                                 |
| `dateTime`    | Knex's [dateTime](http://knexjs.org/#Schema-dateTime) schema type | `value instanceof Date`                                                   |
| `date`        | Knex's [date](http://knexjs.org/#Schema-date) schema type         | `value instanceof Date`                                                   |
| `json`        | Knex's [json](http://knexjs.org/#Schema-json) schema type         | [JSON validation](guides/validation.md#json-validation)                   |
| `jsonb`       | Knex's [jsonb](http://knexjs.org/#Schema-jsonb) schema type       | [JSON validation](guides/validation.md#json-validation)                   |
| Custom types: |                                                                   |                                                                           |
| `uuid4`       | Similar to the `uuid` type but must be a valid V4 UUID            | [validator.isUUID](https://www.npmjs.com/package/validator#validators)    |
| `email`       | Similar to the `string` type but must be a valid email address    | [validator.isEmail](https://www.npmjs.com/package/validator#validators)   |
| `number`      | All numbers, including integers and decimal values                | `typeof value === 'number'`                                               |
| `any`         | Any value                                                         | none                                                                      |
| `jsonObject`  | Objects i.e. `{}`                                                 | [JSON validation](guides/validation.md#json-validation)                   |
| `jsonArray`   | Arrays i.e. `[]`                                                  | [JSON validation](guides/validation.md#json-validation)                   |

## Field inheritance

In knorm, a model's fields are cloned and inherited when the model is inherited.

## Primary and unique fields

## Value casting

**NOTE:** `forSave` cast functions are called before validation.