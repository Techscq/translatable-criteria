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

    // Updated to include new string-based operators
    const stringOnlyOperators = [
      FilterOperator.LIKE,
      FilterOperator.NOT_LIKE,
      FilterOperator.CONTAINS,
      FilterOperator.NOT_CONTAINS,
      FilterOperator.STARTS_WITH,
      FilterOperator.ENDS_WITH,
      FilterOperator.SET_CONTAINS,
      FilterOperator.SET_NOT_CONTAINS,
      FilterOperator.MATCHES_REGEX, // Nuevo
      FilterOperator.ILIKE, // Nuevo
      FilterOperator.NOT_ILIKE, // Nuevo
    ];
    // Error message is now dynamic
    // const stringExpectedErrorMessage = 'Filter value must be a string type';

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
    // Error message is now dynamic
    // const primitiveExpectedErrorMessage =
    //   'Filter value must be a string | number | boolean | Date | null type';

    describe.each(primitiveValueOperators)(
      'Primitive Value Operator (excluding ARRAY_CONTAINS_ELEMENT): %s',
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
      const expectedErrorMessage =
        'For ARRAY_CONTAINS_ELEMENT, value must be a PrimitiveFilterValue or an object like { "path.to.array": elementValue }';

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
        [{ path1: 'val1', path2: 'val2' }], // More than one key
        [{ path: { nested: 'obj' } }], // Value is not primitive
        [{ path: [1, 2] }], // Value is an array, not primitive
        [[]], // Not a primitive or valid object structure
      ])('should throw for invalid value: %s', (invalidValue) => {
        expect(
          () => new Filter(createPrimitive(operator, invalidValue)),
        ).toThrowError(expectedErrorMessage);
      });
    });

    // Updated to include new array-based operators
    const arrayValueOperators = [
      FilterOperator.IN,
      FilterOperator.NOT_IN,
      FilterOperator.SET_CONTAINS_ANY, // Nuevo
      FilterOperator.SET_CONTAINS_ALL, // Nuevo
    ];
    // Error message is now dynamic
    // const arrayValueExpectedErrorMessage =
    //   'Filter value must be an array of string, number, boolean, Date';

    describe.each(arrayValueOperators)(
      'Array Value Operator (IN, NOT_IN, SET_CONTAINS_ANY, SET_CONTAINS_ALL): %s',
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
    ];
    const arrayObjectExpectedErrorMessage =
      'For ARRAY_CONTAINS_ALL/ANY/EQUALS, value must be an Array<Primitive> or an object like { "path.to.array": [elements] }';

    describe.each(arrayObjectOperators)(
      'Array Object Operator: %s',
      (operator) => {
        it.each([
          [['a', 'b']],
          [[1, 2, new Date()]],
          [[]], // Valid direct arrays
          [{ path: ['a', 'b'] }],
          [{ '$.path': [1, 2] }],
          [{ path: [] }], // Valid object forms
        ])('should accept valid value: %s', (validValue) => {
          expect(
            () => new Filter(createPrimitive(operator, validValue)),
          ).not.toThrow();
        });

        it.each([
          'not an array or object',
          [[1, null, 3]], // Array contains null
          [[1, undefined, 3]], // Array contains undefined
          [[1, { a: 1 }, 3]], // Array contains object
          { path1: ['a'], path2: ['b'] }, // Multiple keys in object
          { path: 'not an array' }, // Object value is not an array
          { path: [1, null, 3] }, // Object's array value contains null
        ])('should throw for invalid value: %s', (invalidValue) => {
          const primitive = createPrimitive(operator, invalidValue);
          expect(() => new Filter(primitive)).toThrowError(
            arrayObjectExpectedErrorMessage,
          );
        });
      },
    );

    // Nueva suite de pruebas para BETWEEN y NOT_BETWEEN
    const rangeOperators = [FilterOperator.BETWEEN, FilterOperator.NOT_BETWEEN];

    describe.each(rangeOperators)('Range Operator: %s', (operator) => {
      const expectedErrorMessage = `Filter value for operator ${operator} must be a tuple of two primitive values: [min, max]`;
      it.each([
        [['a', 'z']],
        [[1, 100]],
        [[new Date('2023-01-01'), new Date('2023-12-31')]],
        [[1, 'z']], // Mixed primitives are fine by definition
      ])('should accept a tuple of two primitives: %s', (validValue) => {
        expect(
          () => new Filter(createPrimitive(operator, validValue)),
        ).not.toThrow();
      });

      it.each([
        ['not an array'],
        [[1]], // Not a tuple of two
        [[1, 2, 3]], // More than two elements
        [[1, null]], // Contains null
        [[undefined, 10]], // Contains undefined
        [[{ a: 1 }, 10]], // Contains non-primitive
        [[1, { b: 2 }]], // Contains non-primitive
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
    // Error message is now dynamic
    // const nullExpectedErrorMessage = 'Filter value must be null or undefined';

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

    const jsonOperators = [
      FilterOperator.JSON_CONTAINS,
      FilterOperator.JSON_NOT_CONTAINS,
    ];
    const jsonExpectedErrorMessage = // This one seems to be generic in filter.ts, so it can stay
      'Filter value must be an object where each value is a string, number, boolean, Date, null, an Array, or a Record<string,any>';

    describe.each(jsonOperators)('JSON Operator: %s', (operator) => {
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
        [[1, 2]], // Direct array is not the expected structure for JSON_CONTAINS
        [{ path1: () => console.log('test') }], // Function as value
        [{ path1: undefined }], // Undefined as value
      ])(
        'should throw for non-object or object with invalid inner values: %s',
        (invalidValue) => {
          expect(
            () => new Filter(createPrimitive(operator, invalidValue)),
          ).toThrowError(jsonExpectedErrorMessage);
        },
      );
    });

    // Test for the default case in the constructor's switch statement
    it('should throw for an unhandled operator', () => {
      const unhandledOperator = 'UNHANDLED_OPERATOR' as FilterOperator;
      // Temporarily cast to any to bypass TypeScript's enum check for testing purposes
      const primitive = createPrimitive(unhandledOperator as any, 'test');
      expect(() => new Filter(primitive)).toThrowError(
        `Unhandled filter operator: ${unhandledOperator}`,
      );
    });
  });
});
