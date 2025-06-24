import { describe, it, expect } from 'vitest';
import { Filter } from '../filter.js';
import type { FilterPrimitive } from '../types/filter-primitive.types.js';
import { FilterOperator } from '../../types/operator.types.js';

describe('Filter', () => {
  const primitiveForBasicTests: FilterPrimitive<'name', FilterOperator.EQUALS> =
    {
      field: 'name',
      operator: FilterOperator.EQUALS,
      value: 'test',
    };

  it('should be created from a primitive', () => {
    const filter = new Filter(primitiveForBasicTests);
    expect(filter).toBeInstanceOf(Filter);
    expect(filter.field).toBe('name');
    expect(filter.operator).toBe(FilterOperator.EQUALS);
    expect(filter.value).toBe('test');
  });

  it('should return its primitive representation', () => {
    const filter = new Filter(primitiveForBasicTests);
    const resultPrimitive = filter.toPrimitive();
    expect(resultPrimitive).toEqual(primitiveForBasicTests);
  });

  describe('Constructor Validations', () => {
    const mockField = 'testField' as const;
    const createPrimitive = <Op extends FilterOperator>(
      operator: Op,
      value: any,
    ): FilterPrimitive<typeof mockField, Op> => {
      return { field: mockField, operator, value };
    };

    const stringOnlyOperators = [
      FilterOperator.LIKE,
      FilterOperator.NOT_LIKE,
      FilterOperator.CONTAINS,
      FilterOperator.NOT_CONTAINS,
      FilterOperator.STARTS_WITH,
      FilterOperator.ENDS_WITH,
      FilterOperator.SET_CONTAINS,
      FilterOperator.SET_NOT_CONTAINS,
      FilterOperator.MATCHES_REGEX,
      FilterOperator.ILIKE,
      FilterOperator.NOT_ILIKE,
    ];

    describe.each(stringOnlyOperators)(
      'String Only Operator: %s',
      (operator) => {
        const expectedErrorMessage = `Filter value for operator ${operator} must be a string type`;
        it('should accept string', () => {
          expect(
            () => new Filter(createPrimitive(operator, 'test string')),
          ).not.toThrow();
        });

        it.each([[123], [true], [{}], [[]], [['array', 'of', 'strings']]])(
          'should throw for non-string value: %s',
          (invalidValue) => {
            expect(
              () => new Filter(createPrimitive(operator, invalidValue)),
            ).toThrowError(expectedErrorMessage);
          },
        );
      },
    );

    const primitiveValueOperators = [
      FilterOperator.EQUALS,
      FilterOperator.NOT_EQUALS,
      FilterOperator.GREATER_THAN,
      FilterOperator.GREATER_THAN_OR_EQUALS,
      FilterOperator.LESS_THAN,
      FilterOperator.LESS_THAN_OR_EQUALS,
    ];

    describe.each(primitiveValueOperators)(
      'Primitive Value Operator: %s',
      (operator) => {
        const expectedErrorMessage = `Filter value for operator ${operator} must be a string | number | boolean | Date | null type`;
        it.each([['test string'], [123], [true], [new Date()], [null]])(
          'should accept primitive value: %s',
          (validValue) => {
            expect(
              () => new Filter(createPrimitive(operator, validValue)),
            ).not.toThrow();
          },
        );

        it.each([[undefined], [{ a: 1 }], [[1, 2]]])(
          'should throw for non-primitive value: %s',
          (invalidValue) => {
            expect(
              () => new Filter(createPrimitive(operator, invalidValue)),
            ).toThrowError(expectedErrorMessage);
          },
        );
      },
    );

    describe('ARRAY_CONTAINS_ELEMENT Operator', () => {
      const operator = FilterOperator.ARRAY_CONTAINS_ELEMENT;
      const expectedErrorMessage = `For operator ${operator}, value must be a PrimitiveFilterValue or an object like { "path.to.array": elementValue }`;

      it.each([
        ['test string'],
        [123],
        [true],
        [new Date()],
        [null],
        [{ path: 'test' }],
        [{ '$.path': 123 }],
      ])('should accept valid value: %s', (validValue) => {
        expect(
          () => new Filter(createPrimitive(operator, validValue)),
        ).not.toThrow();
      });

      it.each([
        [undefined],
        [{ path1: 'val1', path2: 'val2' }],
        [{ path: { nested: 'obj' } }],
        [{ path: [1, 2] }],
        [[]],
      ])('should throw for invalid value: %s', (invalidValue) => {
        expect(
          () => new Filter(createPrimitive(operator, invalidValue)),
        ).toThrowError(expectedErrorMessage);
      });
    });

    describe('ARRAY_NOT_CONTAINS_ELEMENT Operator', () => {
      const operator = FilterOperator.ARRAY_NOT_CONTAINS_ELEMENT;
      const expectedErrorMessage = `For operator ${operator}, value must be a PrimitiveFilterValue or an object like { "path.to.array": elementValue }`;

      it.each([
        ['test string'],
        [123],
        [true],
        [new Date()],
        [null],
        [{ path: 'test' }],
        [{ '$.path': 123 }],
      ])('should accept valid value: %s', (validValue) => {
        expect(
          () => new Filter(createPrimitive(operator, validValue)),
        ).not.toThrow();
      });

      it.each([
        [undefined],
        [{ path1: 'val1', path2: 'val2' }],
        [{ path: { nested: 'obj' } }],
        [{ path: [1, 2] }],
        [[]],
      ])('should throw for invalid value: %s', (invalidValue) => {
        expect(
          () => new Filter(createPrimitive(operator, invalidValue)),
        ).toThrowError(expectedErrorMessage);
      });
    });

    const arrayValueOperators = [
      FilterOperator.IN,
      FilterOperator.NOT_IN,
      FilterOperator.SET_CONTAINS_ANY,
      FilterOperator.SET_CONTAINS_ALL,
      FilterOperator.SET_NOT_CONTAINS_ANY, // New
      FilterOperator.SET_NOT_CONTAINS_ALL, // New
    ];

    describe.each(arrayValueOperators)(
      'Array of Primitives Operator: %s',
      (operator) => {
        const expectedErrorMessage = `Filter value for operator ${operator} must be an array of string, number, boolean, Date`;
        it.each([[['a', 'b']], [[1, 2, new Date()]], [[]]])(
          'should accept array of primitives (excluding null/undefined): %s',
          (validValue) => {
            expect(
              () => new Filter(createPrimitive(operator, validValue)),
            ).not.toThrow();
          },
        );

        it.each([
          ['not an array'],
          [[1, null, 3]],
          [[1, undefined, 3]],
          [[1, { a: 1 }, 3]],
        ])(
          'should throw for non-array or array with non-primitives (or null/undefined): %s',
          (invalidValue) => {
            expect(
              () => new Filter(createPrimitive(operator, invalidValue)),
            ).toThrowError(expectedErrorMessage);
          },
        );
      },
    );

    const arrayObjectOperators = [
      FilterOperator.ARRAY_CONTAINS_ALL_ELEMENTS,
      FilterOperator.ARRAY_CONTAINS_ANY_ELEMENT,
      FilterOperator.ARRAY_EQUALS,
      FilterOperator.ARRAY_NOT_EQUALS,
      FilterOperator.ARRAY_EQUALS_STRICT,
      FilterOperator.ARRAY_NOT_EQUALS_STRICT,
      FilterOperator.ARRAY_NOT_CONTAINS_ALL_ELEMENTS,
      FilterOperator.ARRAY_NOT_CONTAINS_ANY_ELEMENT,
    ];

    describe.each(arrayObjectOperators)(
      'Array or Array-in-Object Operator: %s',
      (operator) => {
        const expectedErrorMessage = `For operator ${operator}, value must be an Array<Primitive> or an object like { "path.to.array": [elements] }`;

        it.each([
          [['a', 'b']],
          [[1, 2, new Date()]],
          [[]],
          [{ path: ['a', 'b'] }],
          [{ '$.path': [1, 2] }],
          [{ path: [] }],
        ])('should accept valid value: %s', (validValue) => {
          expect(
            () => new Filter(createPrimitive(operator, validValue)),
          ).not.toThrow();
        });

        it.each([
          'not an array or object',
          [[1, null, 3]],
          [[1, undefined, 3]],
          [[1, { a: 1 }, 3]],
          { path1: ['a'], path2: ['b'] },
          { path: 'not an array' },
          { path: [1, null, 3] },
        ])('should throw for invalid value: %s', (invalidValue) => {
          const primitive = createPrimitive(operator, invalidValue);
          expect(() => new Filter(primitive)).toThrowError(
            expectedErrorMessage,
          );
        });
      },
    );

    const rangeOperators = [FilterOperator.BETWEEN, FilterOperator.NOT_BETWEEN];

    describe.each(rangeOperators)('Range Operator: %s', (operator) => {
      const expectedErrorMessage = `Filter value for operator ${operator} must be a tuple of two primitive values: [min, max]`;
      it.each([
        [['a', 'z']],
        [[1, 100]],
        [[new Date('2023-01-01'), new Date('2023-12-31')]],
        [[1, 'z']],
      ])('should accept a tuple of two primitives: %s', (validValue) => {
        expect(
          () => new Filter(createPrimitive(operator, validValue)),
        ).not.toThrow();
      });

      it.each([
        ['not an array'],
        [[1]],
        [[1, 2, 3]],
        [[1, null]],
        [[undefined, 10]],
        [[{ a: 1 }, 10]],
        [[1, { b: 2 }]],
      ])(
        'should throw for invalid tuple structure or non-primitive/null/undefined values: %s',
        (invalidValue) => {
          expect(
            () => new Filter(createPrimitive(operator, invalidValue)),
          ).toThrowError(expectedErrorMessage);
        },
      );
    });

    const nullOperators = [FilterOperator.IS_NULL, FilterOperator.IS_NOT_NULL];

    describe.each(nullOperators)('Null/Undefined Operator: %s', (operator) => {
      const expectedErrorMessage = `Filter value for operator ${operator} must be null or undefined`;
      it.each([[null], [undefined]])(
        'should accept null or undefined: %s',
        (validValue) => {
          expect(
            () => new Filter(createPrimitive(operator, validValue)),
          ).not.toThrow();
        },
      );

      it.each([['a string'], [0], [{}]])(
        'should throw for other values: %s',
        (invalidValue) => {
          expect(
            () => new Filter(createPrimitive(operator, invalidValue)),
          ).toThrowError(expectedErrorMessage);
        },
      );
    });

    const jsonSingleValueOperators = [
      FilterOperator.JSON_PATH_VALUE_EQUALS,
      FilterOperator.JSON_PATH_VALUE_NOT_EQUALS,
      FilterOperator.JSON_CONTAINS,
      FilterOperator.JSON_NOT_CONTAINS,
    ];

    describe.each(jsonSingleValueOperators)(
      'JSON Single Value Operator: %s',
      (operator) => {
        const expectedErrorMessage = `Filter value for operator ${operator} must be an object where each value is a valid JSON structure (primitive, object, or array).`;

        it.each([
          [{ path1: 'string', path2: 123 }],
          [{ path1: null, path2: new Date(), path3: true }],
          [{ path1: [1, 'a'], path2: { nested: 'value' } }],
          [{}],
        ])('should accept valid object structures: %s', (validValue) => {
          expect(
            () => new Filter(createPrimitive(operator, validValue)),
          ).not.toThrow();
        });

        it.each([
          ['not an object'],
          [123],
          [[1, 2]],
          [{ path1: () => console.log('test') }],
          [{ path1: undefined }],
        ])(
          'should throw for non-object or object with invalid inner values: %s',
          (invalidValue) => {
            expect(
              () => new Filter(createPrimitive(operator, invalidValue)),
            ).toThrowError(expectedErrorMessage);
          },
        );
      },
    );

    const jsonArrayValueOperators = [
      FilterOperator.JSON_CONTAINS_ANY,
      FilterOperator.JSON_CONTAINS_ALL,
      FilterOperator.JSON_NOT_CONTAINS_ANY, // New
      FilterOperator.JSON_NOT_CONTAINS_ALL, // New
    ];

    describe.each(jsonArrayValueOperators)(
      'JSON Array Value Operator: %s',
      (operator) => {
        const expectedErrorMessage = `Filter value for operator ${operator} must be an object where each value is an array of valid JSON structures.`;

        it.each([
          [{ path1: ['string', 123] }],
          [{ path1: [null, new Date(), true] }],
          [{ path1: [[1, 'a'], { nested: 'value' }] }],
          [{ path1: [] }],
          [{}],
        ])('should accept valid object structures: %s', (validValue) => {
          expect(
            () => new Filter(createPrimitive(operator, validValue)),
          ).not.toThrow();
        });

        it.each([
          ['not an object'],
          [123],
          [[1, 2]],
          [{ path1: 'not an array' }],
          [{ path1: [() => console.log('test')] }],
          [{ path1: [undefined] }],
        ])(
          'should throw for non-object or object with invalid inner values: %s',
          (invalidValue) => {
            expect(
              () => new Filter(createPrimitive(operator, invalidValue)),
            ).toThrowError(expectedErrorMessage);
          },
        );
      },
    );

    it('should throw for an unhandled operator', () => {
      const unhandledOperator = 'UNHANDLED_OPERATOR' as FilterOperator;
      const primitive = createPrimitive(unhandledOperator as any, 'test');
      expect(() => new Filter(primitive)).toThrowError(
        `Unhandled filter operator: ${unhandledOperator}`,
      );
    });
  });
});
