import { FilterGroup } from '../filter-group.js';
import { FilterOperator, LogicalOperator } from '../../types/operator.types.js';
import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from '../types/filter-primitive.types.js';

describe('FilterGroup', () => {
  const createFilterPrimitive = (
    field: string,
    value: string,
  ): FilterPrimitive<string, FilterOperator.EQUALS> => ({
    field,
    operator: FilterOperator.EQUALS,
    value,
  });

  describe('normalization', () => {
    it('should flatten nested groups with same logical operator', () => {
      const nestedGroup: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.AND,
        items: [
          createFilterPrimitive('field1', 'value1'),
          {
            logicalOperator: LogicalOperator.AND,
            items: [
              createFilterPrimitive('field2', 'value2'),
              createFilterPrimitive('field3', 'value3'),
            ],
          },
        ],
      };

      const filterGroup = new FilterGroup(nestedGroup);
      const result = filterGroup.toPrimitive();

      expect(result).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [
          createFilterPrimitive('field1', 'value1'),
          createFilterPrimitive('field2', 'value2'),
          createFilterPrimitive('field3', 'value3'),
        ],
      });
    });

    it('should maintain OR structure with AND subgroups', () => {
      const group: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.OR,
        items: [
          {
            logicalOperator: LogicalOperator.AND,
            items: [createFilterPrimitive('field1', 'value1')],
          },
          {
            logicalOperator: LogicalOperator.AND,
            items: [createFilterPrimitive('field2', 'value2')],
          },
        ],
      };

      const filterGroup = new FilterGroup(group);
      const result = filterGroup.toPrimitive();

      expect(result).toEqual(group);
    });

    it('should remove empty groups', () => {
      const groupWithEmpty: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.AND,
        items: [
          createFilterPrimitive('field1', 'value1'),
          {
            logicalOperator: LogicalOperator.AND,
            items: [],
          },
          createFilterPrimitive('field2', 'value2'),
        ],
      };

      const filterGroup = new FilterGroup(groupWithEmpty);
      const result = filterGroup.toPrimitive();

      expect(result).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [
          createFilterPrimitive('field1', 'value1'),
          createFilterPrimitive('field2', 'value2'),
        ],
      });
    });
  });

  describe('addition operations', () => {
    it('should correctly add AND filter to AND group', () => {
      const initial = new FilterGroup({
        logicalOperator: LogicalOperator.AND,
        items: [createFilterPrimitive('field1', 'value1')],
      });

      const result = initial.addAnd(createFilterPrimitive('field2', 'value2'));

      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [
          createFilterPrimitive('field1', 'value1'),
          createFilterPrimitive('field2', 'value2'),
        ],
      });
    });

    it('should correctly add OR filter creating new AND group', () => {
      const initial = new FilterGroup({
        logicalOperator: LogicalOperator.AND,
        items: [createFilterPrimitive('field1', 'value1')],
      });

      const result = initial.addOr(createFilterPrimitive('field2', 'value2'));

      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          {
            logicalOperator: LogicalOperator.AND,
            items: [createFilterPrimitive('field1', 'value1')],
          },
          {
            logicalOperator: LogicalOperator.AND,
            items: [createFilterPrimitive('field2', 'value2')],
          },
        ],
      });
    });

    it('should handle completely empty groups', () => {
      const emptyGroup = new FilterGroup({
        logicalOperator: LogicalOperator.AND,
        items: [],
      });

      expect(emptyGroup.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [],
      });
    });
  });

  describe('special normalization cases', () => {
    it('should simplify group with single element', () => {
      const group: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.AND,
        items: [
          {
            logicalOperator: LogicalOperator.OR,
            items: [
              createFilterPrimitive('field1', 'value1'),
              createFilterPrimitive('field2', 'value2'),
            ],
          },
        ],
      };

      const filterGroup = new FilterGroup(group);
      const result = filterGroup.toPrimitive();

      expect(result).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          createFilterPrimitive('field1', 'value1'),
          createFilterPrimitive('field2', 'value2'),
        ],
      });
    });

    it('should preserve structure when necessary', () => {
      const complexGroup: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.OR,
        items: [
          {
            logicalOperator: LogicalOperator.AND,
            items: [
              createFilterPrimitive('field1', 'value1'),
              createFilterPrimitive('field2', 'value2'),
            ],
          },
          {
            logicalOperator: LogicalOperator.AND,
            items: [
              createFilterPrimitive('field3', 'value3'),
              createFilterPrimitive('field4', 'value4'),
            ],
          },
        ],
      };

      const filterGroup = new FilterGroup(complexGroup);
      const result = filterGroup.toPrimitive();

      expect(result).toEqual(complexGroup);
    });
  });

  describe('FilterGroup - Advanced Cases', () => {
    describe('edge cases normalization', () => {
      it('should handle alternating AND/OR nested structure', () => {
        const complexNested: FilterGroupPrimitive = {
          logicalOperator: LogicalOperator.AND,
          items: [
            {
              logicalOperator: LogicalOperator.OR,
              items: [
                {
                  logicalOperator: LogicalOperator.AND,
                  items: [
                    createFilterPrimitive('field1', 'value1'),
                    createFilterPrimitive('field2', 'value2'),
                  ],
                },
                createFilterPrimitive('field3', 'value3'),
              ],
            },
            createFilterPrimitive('field4', 'value4'),
          ],
        };

        const filterGroup = new FilterGroup(complexNested);
        const result = filterGroup.toPrimitive();

        expect(result).toEqual(complexNested);
      });

      it('should handle multiple empty groups in different levels', () => {
        const multipleEmptyGroups: FilterGroupPrimitive = {
          logicalOperator: LogicalOperator.AND,
          items: [
            {
              logicalOperator: LogicalOperator.OR,
              items: [],
            },
            {
              logicalOperator: LogicalOperator.AND,
              items: [
                {
                  logicalOperator: LogicalOperator.OR,
                  items: [],
                },
                createFilterPrimitive('field1', 'value1'),
              ],
            },
            {
              logicalOperator: LogicalOperator.AND,
              items: [],
            },
          ],
        };

        const filterGroup = new FilterGroup(multipleEmptyGroups);
        const result = filterGroup.toPrimitive();

        expect(result).toEqual({
          logicalOperator: LogicalOperator.AND,
          items: [createFilterPrimitive('field1', 'value1')],
        });
      });
    });

    describe('different operators', () => {
      it('should handle all available filter operators', () => {
        const allOperators: FilterGroupPrimitive = {
          logicalOperator: LogicalOperator.AND,
          items: [
            {
              field: 'field1',
              operator: FilterOperator.EQUALS,
              value: 'value1',
            },
            {
              field: 'field2',
              operator: FilterOperator.NOT_EQUALS,
              value: 'value2',
            },
            {
              field: 'field3',
              operator: FilterOperator.GREATER_THAN,
              value: '100',
            },
            {
              field: 'field4',
              operator: FilterOperator.LESS_THAN,
              value: '200',
            },
            {
              field: 'field5',
              operator: FilterOperator.CONTAINS,
              value: 'partial',
            },
          ],
        };

        const filterGroup = new FilterGroup(allOperators);
        const result = filterGroup.toPrimitive();

        expect(result).toEqual(allOperators);
      });
    });

    describe('deeply nested structures', () => {
      it('should handle deeply nested structure with 5+ levels', () => {
        const deeplyNested: FilterGroupPrimitive = {
          logicalOperator: LogicalOperator.OR,
          items: [
            {
              logicalOperator: LogicalOperator.AND,
              items: [
                {
                  logicalOperator: LogicalOperator.OR,
                  items: [
                    {
                      logicalOperator: LogicalOperator.AND,
                      items: [
                        {
                          logicalOperator: LogicalOperator.OR,
                          items: [createFilterPrimitive('field1', 'value1')],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        };

        const filterGroup = new FilterGroup(deeplyNested);
        const result = filterGroup.toPrimitive();

        expect(result).toEqual({
          logicalOperator: LogicalOperator.OR,
          items: [createFilterPrimitive('field1', 'value1')],
        });
      });
    });

    describe('performance tests', () => {
      it('should handle large groups efficiently', () => {
        const items = Array.from({ length: 1000 }, (_, index) =>
          createFilterPrimitive(`field${index}`, `value${index}`),
        );

        const largeGroup: FilterGroupPrimitive = {
          logicalOperator: LogicalOperator.AND,
          items,
        };

        const startTime = performance.now();
        const filterGroup = new FilterGroup(largeGroup);
        const result = filterGroup.toPrimitive();
        const endTime = performance.now();

        expect(result.items).toHaveLength(1000);
        expect(endTime - startTime).toBeLessThan(100);
      });

      it('should handle complex nested structure efficiently', () => {
        const complexStructure: FilterGroupPrimitive = {
          logicalOperator: LogicalOperator.AND,
          items: [
            {
              logicalOperator: LogicalOperator.AND,
              items: [
                createFilterPrimitive('field1', 'value1'),
                createFilterPrimitive('field2', 'value2'),
              ],
            },
            {
              logicalOperator: LogicalOperator.AND,
              items: [
                createFilterPrimitive('field3', 'value3'),
                {
                  logicalOperator: LogicalOperator.AND,
                  items: [createFilterPrimitive('field4', 'value4')],
                },
              ],
            },
          ],
        };

        const startTime = performance.now();
        const filterGroup = new FilterGroup(complexStructure);
        const result = filterGroup.toPrimitive();
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(100);

        expect(result).toEqual({
          logicalOperator: LogicalOperator.AND,
          items: [
            createFilterPrimitive('field1', 'value1'),
            createFilterPrimitive('field2', 'value2'),
            createFilterPrimitive('field3', 'value3'),
            createFilterPrimitive('field4', 'value4'),
          ],
        });
      });
    });
  });
});
