import {
  Order,
  OrderDirection,
  _resetOrderSequenceForTesting,
} from '../order.js';

describe('Order', () => {
  beforeEach(() => {
    _resetOrderSequenceForTesting();
  });

  it('should be created with field and direction', () => {
    const order = new Order(OrderDirection.DESC, 'createdAt');
    expect(order).toBeInstanceOf(Order);
    expect(order.field).toBe('createdAt');
    expect(order.direction).toBe(OrderDirection.DESC);
  });

  it('should have an auto-incrementing and predictable sequenceId', () => {
    const order1 = new Order(OrderDirection.ASC, 'field1');
    const order2 = new Order(OrderDirection.DESC, 'field2');
    const order3 = new Order(OrderDirection.ASC, 'field3');

    expect(order1.sequenceId).toBeLessThan(order2.sequenceId);
    expect(order2.sequenceId).toBeLessThan(order3.sequenceId);

    expect(order1.sequenceId).toBe(1);
    expect(order2.sequenceId).toBe(2);
    expect(order3.sequenceId).toBe(3);
  });

  describe('nullsFirst property', () => {
    it('should default to false if not provided', () => {
      const order = new Order(OrderDirection.ASC, 'name');
      expect(order.nullsFirst).toBe(false);
    });

    it('should be set to true if provided', () => {
      const order = new Order(OrderDirection.DESC, 'updatedAt', true);
      expect(order.nullsFirst).toBe(true);
    });
  });

  describe('toPrimitive', () => {
    it('should return its primitive representation with nulls_first as false by default', () => {
      const order = new Order(OrderDirection.DESC, 'createdAt');
      const resultPrimitive = order.toPrimitive();

      expect(resultPrimitive).toEqual({
        field: 'createdAt',
        direction: OrderDirection.DESC,
        sequence_id: 1,
        nulls_first: false,
      });
    });

    it('should return its primitive representation with nulls_first as true when specified', () => {
      const order = new Order(OrderDirection.ASC, 'name', true);
      const resultPrimitive = order.toPrimitive();

      expect(resultPrimitive).toEqual({
        field: 'name',
        direction: OrderDirection.ASC,
        sequence_id: 1,
        nulls_first: true,
      });
    });
  });
});
