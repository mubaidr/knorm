const uuid = require('uuid');
const Field = require('../lib/Field');
const Model = require('../lib/Model');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('./lib/unexpected-workaround'));

describe('Field', function() {
  describe('constructor', function() {
    it('throws an error if the field name is not provided', function() {
      expect(() => new Field(), 'to throw', new Error('Field requires a name'));
    });

    it('throws an error if the model is not provided', function() {
      expect(
        () => new Field({ name: 'foo' }),
        'to throw',
        new Error("Field 'foo' requires a subclass of Model")
      );
    });

    it('throws an error if the field type is not provided', function() {
      class Foo extends Model {}
      expect(
        () =>
          new Field({
            name: 'bar',
            model: Foo
          }),
        'to throw',
        new Error("Field 'Foo.bar' has no type configured")
      );
    });

    it('throws an error if the field type is not supported', function() {
      class Foo extends Model {}
      expect(
        () =>
          new Field({
            name: 'bar',
            model: Foo,
            type: 'bar'
          }),
        'to throw',
        new Error("Field 'Foo.bar' has an invalid type ('bar')")
      );
    });

    it("throws an error if 'validate' is provided and is not a function", function() {
      class Foo extends Model {}
      expect(
        () =>
          new Field({
            name: 'bar',
            model: Foo,
            type: Field.types.string,
            validate: {
              oneOf: ['foo', 'bar']
            }
          }),
        'to throw',
        new Error("Custom validator for field 'Foo.bar' should be a function")
      );
    });

    it("calls setModel with the 'model' config passed", function() {
      class Foo extends Model {}
      const stub = sinon.stub(Field.prototype, 'setModel');
      new Field({
        name: 'bar',
        model: Foo,
        type: Field.types.string
      });
      expect(stub, 'to have calls satisfying', () => {
        stub(expect.it('to be model class', Foo));
      });
      stub.restore();
    });

    it("calls setReference with the reference if a 'references' config is passed", function() {
      class Foo extends Model {}
      const stub = sinon.stub(Field.prototype, 'setReference');
      new Field({
        name: 'bar',
        references: 'foo bar',
        model: Foo,
        type: Field.types.string
      });
      expect(stub, 'to have calls satisfying', () => {
        stub('foo bar');
      });
      stub.restore();
    });

    describe('with a column name configured', function() {
      it("sets the field's column name from configured value", function() {
        class Foo extends Model {}
        const field = new Field({
          name: 'bar',
          model: Foo,
          type: Field.types.string,
          column: 'the column name'
        });
        expect(field.column, 'to be', 'the column name');
      });

      it('does not call getColumnName', function() {
        class Foo extends Model {}
        const spy = sinon.spy(Field.prototype, 'getColumnName');
        new Field({
          name: 'bar',
          model: Foo,
          type: Field.types.string,
          column: 'bar'
        });
        expect(spy, 'was not called');
        spy.restore();
      });
    });

    describe('without a column name configured', function() {
      it("calls getColumnName to set the field's column name", function() {
        class Foo extends Model {}
        const stub = sinon
          .stub(Field.prototype, 'getColumnName')
          .returns('the column name');
        const field = new Field({
          name: 'bar',
          model: Foo,
          type: Field.types.string
        });
        expect(stub, 'to have calls satisfying', () => {
          stub('bar');
        });
        expect(field.column, 'to be', 'the column name');
        stub.restore();
      });
    });

    describe('with `cast` options', function() {
      it('throws if `cast.forSave` is not a function', function() {
        class Foo extends Model {}
        expect(
          () =>
            new Field({
              name: 'bar',
              model: Foo,
              type: Field.types.string,
              cast: {
                forSave: 'foo'
              }
            }),
          'to throw',
          new Error(
            "Pre-save cast function for field 'Foo.bar' should be a function"
          )
        );
      });

      it('throws if `cast.forFetch` is not a function', function() {
        class Foo extends Model {}
        expect(
          () =>
            new Field({
              name: 'bar',
              model: Foo,
              type: Field.types.string,
              cast: {
                forFetch: 'foo'
              }
            }),
          'to throw',
          new Error(
            "Post-fetch cast function for field 'Foo.bar' should be a function"
          )
        );
      });
    });
  });

  describe('Field.prototype.clone', function() {
    it('returns a clone of the field', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'bar',
        model: Foo,
        type: Field.types.string
      });
      expect(
        field.clone(),
        'to equal',
        new Field({
          name: 'bar',
          model: Foo,
          type: Field.types.string
        })
      );
    });

    it('copies the column name of the field', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'bar',
        model: Foo,
        type: Field.types.string,
        column: 'the-column-name'
      });
      expect(field.clone(), 'to satisfy', {
        column: 'the-column-name'
      });
    });

    it('clones cast functions returns a clone of the field', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'bar',
        model: Foo,
        type: Field.types.string,
        cast: {
          forSave() {}
        }
      });
      expect(field.clone(), 'to satisfy', {
        castors: {
          forSave() {}
        }
      });
    });

    it('clones the schemas for json(b) fields', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'bar',
        model: Foo,
        type: Field.types.json,
        schema: { foo: { required: true } }
      });
      expect(field.clone(), 'to satisfy', {
        validators: { schema: { foo: { required: true } } }
      });
    });
  });

  describe('Field.prototype.getColumnName', function() {
    it('returns the field name passed as is', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'firstName',
        model: Foo,
        type: Field.types.string
      });
      expect(field.getColumnName('firstName'), 'to be', 'firstName');
    });
  });

  describe('Field.prototype.throwValidationError', function() {
    it('throws a `ValidationError`', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'firstName',
        model: Foo,
        type: Field.types.string
      });
      expect(() => field.throwValidationError(), 'to throw', {
        name: 'ValidationError'
      });
    });

    it('throws a validation error from `Field.ValidationError`', function() {
      // allows configuring the ValidationError class entirely
      class CustomValidationError {}
      const ValidationError = Field.ValidationError;
      Field.ValidationError = CustomValidationError;
      class Foo extends Model {}
      const field = new Field({
        name: 'firstName',
        model: Foo,
        type: Field.types.string
      });
      expect(
        () => field.throwValidationError(),
        'to throw',
        new CustomValidationError()
      );
      Field.ValidationError = ValidationError;
    });
  });

  describe('Field.prototype.cast', function() {
    class User extends Model {}

    describe('with no cast functions defined', function() {
      it('returns undefined', function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string
        });
        expect(
          field.cast('bar value', 'a model instance', { forSave: true }),
          'to be undefined'
        );
      });
    });

    describe('with a `forSave` cast function', function() {
      it('calls the function with the value if the `forSave` option is enabled', function() {
        const forSave = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          cast: {
            forSave
          }
        });
        field.cast('bar value', 'a model instance', { forSave: true });
        expect(forSave, 'was called with', 'bar value');
      });

      it('calls the function with `this` set to the passed model instance', function() {
        const forSave = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          cast: {
            forSave
          }
        });
        field.cast('bar value', 'a model instance', { forSave: true });
        expect(forSave, 'was called on', 'a model instance');
      });
    });

    describe('with a `forFetch` cast function', function() {
      it('calls the function with the value if the `forFetch` option is enabled', function() {
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          cast: {
            forFetch
          }
        });
        field.cast('bar value', 'a model instance', { forFetch: true });
        expect(forFetch, 'was called with', 'bar value');
      });

      it('calls the function with `this` set to the passed model instance', function() {
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          cast: {
            forFetch
          }
        });
        field.cast('bar value', 'a model instance', { forFetch: true });
        expect(forFetch, 'was called on', 'a model instance');
      });
    });

    describe('with both `forFetch` and `forSave` cast functions', function() {
      it('calls only the `forFetch` cast function if the `forFetch` option is enabled', function() {
        const forSave = sinon.spy();
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          cast: {
            forSave,
            forFetch
          }
        });
        field.cast('bar value', 'a model instance', { forFetch: true });
        expect(forFetch, 'was called');
        expect(forSave, 'was not called');
      });

      it('calls only the `forSave` cast function if the `forSave` option is enabled', function() {
        const forSave = sinon.spy();
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          cast: {
            forSave,
            forFetch
          }
        });
        field.cast('bar value', 'a model instance', { forSave: true });
        expect(forSave, 'was called');
        expect(forFetch, 'was not called');
      });
    });
  });

  describe('Field.prototype.hasDefault', function() {
    class User extends Model {}

    it('returns false if the field was not configured with a default value', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string
      });
      expect(field.hasDefault(), 'to be false');
    });

    it('returns true if the field was configured with a default value', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string,
        default: 'foo'
      });
      expect(field.hasDefault(), 'to be true');
    });

    it('returns true if the field was configured with a default value as a function', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string,
        default: () => {}
      });
      expect(field.hasDefault(), 'to be true');
    });

    it("returns true if the field was configured with the default value as 'false'", function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string,
        default: false
      });
      expect(field.hasDefault(), 'to be true');
    });

    it("returns true if the field was configured with the default value as 'null'", function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string,
        default: null
      });
      expect(field.hasDefault(), 'to be true');
    });
  });

  describe('Field.prototype.getDefault', function() {
    class User extends Model {}

    it('returns the default value configured', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string,
        default: 'foo'
      });
      expect(field.getDefault(), 'to be', 'foo');
    });

    describe('when the default value is a function', function() {
      it('returns the return value of the function', function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          default: () => 'bar'
        });
        expect(field.getDefault(), 'to be', 'bar');
      });

      it("calls the function with 'this' set to the instance passed", function() {
        const stub = sinon.stub().returns('bar');
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          default: stub
        });
        field.getDefault('a model instance');
        expect(stub, 'was called once').and(
          'was called on',
          'a model instance'
        );
      });
    });
  });

  describe('Field.prototype.validate', function() {
    class User extends Model {}

    it('returns a Promise', async function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string
      });
      await expect(field.validate(), 'to be fulfilled');
    });

    describe('required', function() {
      it('rejects with a RequiredError if no value is passed', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          required: true
        });
        await expect(field.validate(), 'to be rejected with', {
          name: 'ValidationError',
          type: 'RequiredError'
        });
      });

      it("rejects if the value is 'undefined'", async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          required: true
        });
        await expect(field.validate(undefined), 'to be rejected with', {
          name: 'ValidationError',
          type: 'RequiredError'
        });
      });

      it("rejects if the value is 'null'", async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          required: true
        });
        await expect(field.validate(null), 'to be rejected with', {
          name: 'ValidationError',
          type: 'RequiredError'
        });
      });

      it('resolves if the value is set', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          required: true
        });
        await expect(field.validate('foo'), 'to be fulfilled');
      });
    });

    describe('type', function() {
      it('rejects with a TypeError if an invalid value is set', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.text
        });
        await expect(field.validate({}), 'to be rejected with', {
          name: 'ValidationError',
          type: 'TypeError'
        });
      });

      it('does not type-validate if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.text
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not type-validate if the value is null', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.text
        });
        await expect(field.validate(null), 'to be fulfilled');
      });

      describe('resolves for valid types', function() {
        it("strings against the 'string' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.string
          });
          await expect(field.validate('foo'), 'to be fulfilled');
        });

        it("strings against the 'text' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.text
          });
          await expect(field.validate('foo'), 'to be fulfilled');
        });

        it("numbers against the 'integer' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.integer
          });
          await expect(field.validate(1), 'to be fulfilled');
        });

        it("dates against the 'dateTime' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.dateTime
          });
          await expect(field.validate(new Date()), 'to be fulfilled');
        });

        it("dates against the 'date' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.date
          });
          await expect(field.validate(new Date()), 'to be fulfilled');
        });

        it("true against the 'boolean' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.boolean
          });
          await expect(field.validate(true), 'to be fulfilled');
        });

        it("false against the 'boolean' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.boolean
          });
          await expect(field.validate(false), 'to be fulfilled');
        });

        it("uuid.v4 against the 'uuid' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.uuid
          });
          await expect(field.validate(uuid.v4()), 'to be fulfilled');
        });

        it("uuid.v1 against the 'uuid' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.uuid
          });
          await expect(field.validate(uuid.v1()), 'to be fulfilled');
        });

        it("uuid.v4 against the 'uuidV4' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.uuidV4
          });
          await expect(field.validate(uuid.v4()), 'to be fulfilled');
        });

        it("floating point values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.decimal
          });
          await expect(field.validate(10.56), 'to be fulfilled');
        });

        it("floating point values without whole numbers against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.decimal
          });
          await expect(field.validate(0.5600976), 'to be fulfilled');
        });

        it("integer values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.decimal
          });
          await expect(field.validate(30), 'to be fulfilled');
        });

        it("zero against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.decimal
          });
          await expect(field.validate(0), 'to be fulfilled');
        });

        it("string floating point values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.decimal
          });
          await expect(field.validate('10.00'), 'to be fulfilled');
        });

        it("positive string floating point values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.decimal
          });
          await expect(field.validate('+10.00345'), 'to be fulfilled');
        });

        it("negative floating point values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.decimal
          });
          await expect(field.validate(-9923410.03), 'to be fulfilled');
        });

        it("buffer values against the 'binary' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.binary
          });
          await expect(field.validate(Buffer.from('')), 'to be fulfilled');
        });

        it("email values against the 'email' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.email
          });
          await expect(field.validate('foo@bar.com'), 'to be fulfilled');
        });
      });

      describe('rejects for invalid types', function() {
        it("for fractions against the 'integer' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.integer
          });
          await expect(field.validate(1.5), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for string numbers against the 'integer' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.integer
          });
          await expect(field.validate('1'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for date strings against the 'dateTime' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.dateTime
          });
          const dateString = new Date().toString();
          await expect(field.validate(dateString), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for date strings against the 'date' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.date
          });
          const dateString = new Date().toString();
          await expect(field.validate(dateString), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for truthy values against the 'boolean' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.boolean
          });
          await expect(field.validate(1), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for falsy values against the 'boolean' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.boolean
          });
          await expect(field.validate(0), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("invalid uuid's against the 'uuid' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.uuid
          });
          await expect(
            field.validate('not-valid-uuid'),
            'to be rejected with',
            { name: 'ValidationError', type: 'TypeError' }
          );
        });

        it("uuid.v1 against the 'uuidV4' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.uuidV4
          });
          const uuidV1 = uuid.v1();
          await expect(field.validate(uuidV1), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("strings against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.decimal
          });
          await expect(field.validate('foo'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("string values against the 'binary' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.binary
          });
          await expect(field.validate('bar'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("object values against the 'binary' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.binary
          });
          await expect(field.validate({}), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("invalid email values against the 'email' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.email
          });
          await expect(field.validate('foo@bar'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("integer values against the 'email' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.email
          });
          await expect(field.validate(1), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });
      });
    });

    describe('minLength', function() {
      it('rejects with a MinLengthError if the value is shorter than the minLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          minLength: 6
        });
        await expect(field.validate('a'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'MinLengthError'
        });
      });

      it('does not reject an if the value is the same lenth as the minLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          minLength: 6
        });
        await expect(field.validate('123456'), 'to be fulfilled');
      });

      it('does not reject an if the value is longer than the minLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          minLength: 6
        });
        await expect(field.validate('1234567'), 'to be fulfilled');
      });

      it('does not reject if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          minLength: 6
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          minLength: 6
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('maxLength', function() {
      it('rejects with a MaxLengthError if the value is longer than the maxLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          maxLength: 6
        });
        await expect(field.validate('1234567'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'MaxLengthError'
        });
      });

      it('does not reject an if the value is the same lenth as the maxLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          maxLength: 6
        });
        await expect(field.validate('123456'), 'to be fulfilled');
      });

      it('does not reject an if the value is shorter than the maxLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          maxLength: 6
        });
        await expect(field.validate('12345'), 'to be fulfilled');
      });

      it('does not reject if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          maxLength: 6
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          maxLength: 6
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('oneOf', function() {
      it('rejects with a OneOfError if the value is not included in oneOf', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer,
          oneOf: [1, 2]
        });
        await expect(field.validate(3), 'to be rejected with', {
          name: 'ValidationError',
          type: 'OneOfError'
        });
      });

      it('does not reject if the value is included in oneOf', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer,
          oneOf: [1, 2]
        });
        await expect(field.validate(1), 'to be fulfilled');
      });

      it('checks against the casing of strings', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          oneOf: ['READ', 'UNREAD']
        });
        await expect(field.validate('read'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'OneOfError'
        });
      });

      it('does not reject if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer,
          oneOf: [1, 2]
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer,
          oneOf: [1, 2]
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('equals', function() {
      it('rejects with an EqualsError if the value does not equal the expected value', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer,
          equals: 1
        });
        await expect(field.validate(3), 'to be rejected with', {
          name: 'ValidationError',
          type: 'EqualsError'
        });
      });

      it('does not reject if the value equals the expected value', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer,
          equals: 1
        });
        await expect(field.validate(1), 'to be fulfilled');
      });

      it('checks against the casing of strings', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          equals: 'READ'
        });
        await expect(field.validate('read'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'EqualsError'
        });
      });

      it('does not reject if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer,
          equals: 1
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer,
          equals: 1
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('with a custom validator', function() {
      it('calls the validator with the passed value', async function() {
        const validate = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate
        });
        await field.validate('bar value');
        await expect(validate, 'to have calls satisfying', () => {
          validate('bar value');
        });
      });

      it("calls the validator with 'this' set to the passed model instance", async function() {
        const validate = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate
        });
        await field.validate('bar value', 'a model instance');
        await expect(validate, 'was called once').and(
          'was called on',
          'a model instance'
        );
      });

      it('does not call the validator if no value is passed', async function() {
        const validate = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate
        });
        await field.validate();
        await expect(validate, 'was not called');
      });

      it("does not call the validator if the passed value is 'null'", async function() {
        const validate = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate
        });
        await field.validate(null);
        await expect(validate, 'was not called');
      });

      it('rejects with the error thrown from the validator', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {
            throw new Error('custom error');
          }
        });
        await expect(
          field.validate('bar value'),
          'to be rejected with',
          new Error('custom error')
        );
      });

      it('rejects with the rejection reason returned from the validator', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {
            return Promise.reject(new Error('rejection reason'));
          }
        });
        await expect(
          field.validate('bar value'),
          'to be rejected with',
          new Error('rejection reason')
        );
      });

      it('rejects with a ValidatorError if the validator returns `false`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {
            return false;
          }
        });
        await expect(field.validate('bar value'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'ValidatorError'
        });
      });

      it('does not reject if the validator returns nothing', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {}
        });
        await expect(field.validate(), 'to be fulfilled');
      });

      it('runs the new validators if the validator returns an object with validators', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {
            return {
              maxLength: 2
            };
          }
        });
        await expect(field.validate('bar value'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'MaxLengthError'
        });
      });

      it("runs the new validator if the first validator returns an object with a 'validate' function", async function() {
        const secondValidateSpy = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {
            return {
              validate: secondValidateSpy
            };
          }
        });
        await field.validate('bar value');
        expect(secondValidateSpy, 'to have calls satisfying', () => {
          secondValidateSpy('bar value');
        });
      });

      it("runs the new custom validator with 'this' set to the passed model instance", async function() {
        const secondValidateSpy = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {
            return {
              validate: secondValidateSpy
            };
          }
        });
        await field.validate('bar value', 'a model instance');
        await expect(secondValidateSpy, 'was called once').and(
          'was called on',
          'a model instance'
        );
      });

      it('runs the new custom validator asynchronously', async function() {
        let called;
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {
            return {
              validate() {
                return Promise.resolve().then(() => {
                  called = true;
                });
              }
            };
          }
        });
        await field.validate('bar value');
        expect(called, 'to be true');
      });

      it("does nothing if the validator returns an object that doesn't contain validators", async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.string,
          validate() {
            return new Date();
          }
        });
        await expect(field.validate(), 'to be fulfilled');
      });
    });

    describe('for `json` and `jsonb` fields', function() {
      describe('when passed a string value', function() {
        it("fulfils for a valid json string against the 'json' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.json
          });
          await expect(
            field.validate('[{ "foo": "foo", "bar": "bar" }]'),
            'to be fulfilled'
          );
        });

        it("fulfils for valid json strings against the 'jsonb' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.jsonb
          });
          await expect(field.validate('{"foo":1}'), 'to be fulfilled');
        });

        it("rejects for invalid json against the 'json' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.json
          });
          await expect(
            field.validate('{not: "valid"}'),
            'to be rejected with',
            { name: 'ValidationError', type: 'TypeError' }
          );
        });

        it("rejects for invalid json against the 'jsonb' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: Field.types.jsonb
          });
          await expect(field.validate(']'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });
      });

      describe('with `schema` validators configured', function() {
        const field = new Field({
          name: 'json',
          model: User,
          type: Field.types.json,
          schema: {
            foo: { required: true, type: Field.types.string },
            bar: [{ type: Field.types.date }],
            quux: []
          }
        });

        it('runs the validators against object values', async function() {
          await expect(field.validate({ foo: 1 }), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
          await expect(field.validate({ foo: 'bar' }), 'to be fulfilled');
        });

        it('runs the validators against every item in an array value', async function() {
          await expect(
            field.validate({ foo: 'bar', bar: new Date() }),
            'to be rejected with',
            { name: 'ValidationError', type: 'TypeError' }
          );
          await expect(
            field.validate({ foo: 'bar', bar: [new Date()] }),
            'to be fulfilled'
          );
        });

        it('passes validation for every item if the schema validator is an empty array', async function() {
          await expect(
            field.validate({ foo: 'bar', quux: [] }),
            'to be fulfilled'
          );
          await expect(
            field.validate({ foo: 'bar', quux: [1] }),
            'to be fulfilled'
          );
          await expect(
            field.validate({ foo: 'bar', quux: ['foo'] }),
            'to be fulfilled'
          );
        });

        it('parses string values and runs the validators against the parsed value', async function() {
          await expect(field.validate('{"foo":null}'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'RequiredError'
          });
          await expect(field.validate('{"foo":"bar"}'), 'to be fulfilled');
        });

        it('rejects if passed an array value for a field that is not configured as an array', async function() {
          await expect(
            field.validate({ foo: ['bar'] }),
            'to be rejected with',
            { name: 'ValidationError', type: 'TypeError' }
          );
        });

        it('rejects if passed a non-array value for a field that is configured as an array', async function() {
          await expect(
            field.validate({ bar: new Date() }),
            'to be rejected with',
            { name: 'ValidationError', type: 'TypeError' }
          );
        });

        describe('as an array', function() {
          const field = new Field({
            name: 'json',
            model: User,
            type: Field.types.jsonb,
            schema: [{ foo: { required: true, type: Field.types.string } }]
          });

          it('rejects if the value is not an array', async function() {
            await expect(
              field.validate({ foo: ['bar'] }),
              'to be rejected with',
              { name: 'ValidationError', type: 'TypeError' }
            );
          });

          it('rejects if one item in the value fails validation', async function() {
            await expect(
              field.validate([{ foo: 'foo' }, { foo: 'bar' }, { foo: 1 }]),
              'to be rejected with',
              { name: 'ValidationError', type: 'TypeError' }
            );
          });

          it('fulfils if every item in the value passes validation', async function() {
            await expect(
              field.validate([{ foo: 'bar' }, { foo: 'quux' }]),
              'to be fulfilled'
            );
          });

          it('fulfils for all array values if `schema` is an empty array', async function() {
            const field = new Field({
              name: 'json',
              model: User,
              type: Field.types.jsonb,
              schema: []
            });
            await expect(field.validate([]), 'to be fulfilled');
            await expect(field.validate(['foo']), 'to be fulfilled');
            await expect(field.validate([[1]]), 'to be fulfilled');
          });
        });
      });
    });
  });

  describe('Field.prototype.setReference', function() {
    it("stores the reference in the field's data properties", function() {
      class User extends Model {}

      const firstName = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string
      });
      const lastName = new Field({
        name: 'lastName',
        model: User,
        type: Field.types.string
      });

      firstName.setReference(lastName);

      expect(firstName.references, 'to equal', lastName);
    });

    it("adds the reference to the field's model's references", function() {
      class User extends Model {}
      class Image extends Model {}

      const id = new Field({
        name: 'id',
        model: User,
        type: Field.types.integer
      });
      const createdAt = new Field({
        name: 'createdAt',
        model: User,
        type: Field.types.dateTime
      });
      const userId = new Field({
        name: 'userId',
        model: Image,
        type: Field.types.integer
      });
      const userCreatedAt = new Field({
        name: 'userCreatedAt',
        model: Image,
        type: Field.types.dateTime
      });

      userId.setReference(id);
      userCreatedAt.setReference(createdAt);

      expect(User.references, 'to equal', {});
      expect(Image.references, 'to equal', {
        User: {
          userId: id,
          userCreatedAt: createdAt
        }
      });
    });

    it('adds reverse-references to the referenced model', function() {
      class User extends Model {}
      class Image extends Model {}

      const id = new Field({
        name: 'id',
        model: User,
        type: Field.types.integer
      });
      const createdAt = new Field({
        name: 'createdAt',
        model: User,
        type: Field.types.dateTime
      });
      const userId = new Field({
        name: 'userId',
        model: Image,
        type: Field.types.integer
      });
      const userCreatedAt = new Field({
        name: 'userCreatedAt',
        model: Image,
        type: Field.types.dateTime
      });

      userId.setReference(id);
      userCreatedAt.setReference(createdAt);

      expect(Image.referenced, 'to equal', {});
      expect(User.referenced, 'to equal', {
        Image: {
          id: [userId],
          createdAt: [userCreatedAt]
        }
      });
    });

    it("doesn't overwrite reverse-references to the same field", function() {
      class User extends Model {}
      class Image extends Model {}

      const id = new Field({
        name: 'id',
        model: User,
        type: Field.types.integer
      });
      const userId1 = new Field({
        name: 'userId1',
        model: Image,
        type: Field.types.integer
      });
      const userId2 = new Field({
        name: 'userId2',
        model: Image,
        type: Field.types.integer
      });

      userId1.setReference(id);
      userId2.setReference(id);

      expect(Image.referenced, 'to equal', {});
      expect(User.referenced, 'to equal', {
        Image: {
          id: [userId1, userId2]
        }
      });
    });

    it('allows chaining', function() {
      class User extends Model {}
      const firstName = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string
      });
      const lastName = new Field({
        name: 'lastName',
        model: User,
        type: Field.types.string
      });
      expect(firstName.setReference(lastName), 'to equal', firstName);
    });
  });

  describe('Field.prototype.setModel', function() {
    class User extends Model {}

    it('allows chaining', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: Field.types.string
      });
      expect(field.setModel(User), 'to equal', field);
    });

    describe('when called again', function() {
      class Employee extends User {}

      it('updates the model that the field belongs to', function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: Field.types.integer
        });

        expect(field.model, 'to equal', User);
        field.setModel(Employee);
        expect(field.model, 'to equal', Employee);
      });

      describe('when the field has a reference', function() {
        it('updates the reverse-references to the new model', function() {
          class Image extends Model {}

          const id = new Field({
            name: 'id',
            model: User,
            type: Field.types.integer
          });
          const userId = new Field({
            name: 'userId',
            model: Image,
            type: Field.types.integer,
            references: id
          });

          expect(User.referenced, 'to equal', {
            Image: {
              id: [userId]
            }
          });

          class UserImage extends User {}

          userId.setModel(UserImage);

          expect(User.referenced, 'to equal', {
            UserImage: {
              id: [userId]
            }
          });
        });
      });
    });
  });
});
