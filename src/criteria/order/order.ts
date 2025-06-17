export const OrderDirection = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const;
export type OrderDirection = keyof typeof OrderDirection;

let globalOrderSequence: number = 0;
export type OrderByPrimitive<T extends string = string> = {
  direction: OrderDirection;
  field: T;
};

export class Order<T extends string = string> {
  protected _sequenceId: number;
  constructor(
    protected readonly _direction: OrderDirection,
    protected readonly _field: T,
  ) {
    globalOrderSequence++;
    this._sequenceId = globalOrderSequence;
  }

  get sequenceId(): number {
    return this._sequenceId;
  }

  get field(): T {
    return this._field;
  }

  get direction(): OrderDirection {
    return this._direction;
  }

  toPrimitive(): OrderByPrimitive<T> {
    return {
      direction: this._direction,
      field: this._field,
    };
  }
}
