import { Order, type OrderByPrimitive, OrderDirection } from '../order.js';

describe('Order', () => {
  const primitive: OrderByPrimitive = {
    field: 'createdAt',
    direction: OrderDirection.DESC,
  };
  it('should have an auto-incrementing sequenceId', () => {
    const order1 = new Order(OrderDirection.ASC, 'field1');
    const order2 = new Order(OrderDirection.DESC, 'field2');
    const order3 = new Order(OrderDirection.ASC, 'field3');

    expect(order1.sequenceId).toBeLessThan(order2.sequenceId);
    expect(order2.sequenceId).toBeLessThan(order3.sequenceId);
    expect(order1.sequenceId).toBe(1);
    expect(order2.sequenceId).toBe(2);
    expect(order3.sequenceId).toBe(3);
  });
  it('should be created with field and direction', () => {
    const order = new Order(primitive.direction, primitive.field);
    expect(order).toBeInstanceOf(Order);
    expect(order.field).toBe('createdAt');
    expect(order.direction).toBe(OrderDirection.DESC);
  });

  it('should return its primitive representation', () => {
    const order = new Order(primitive.direction, primitive.field);
    const resultPrimitive = order.toPrimitive();
    expect(resultPrimitive).toEqual(primitive);
  });
});
