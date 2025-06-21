// --- Core Classes, Factories, and Abstract Classes ---
export { CriteriaFactory } from './criteria-factory.js';
export { RootCriteria } from './root.criteria.js';
export { InnerJoinCriteria } from './join/inner.join-criteria.js';
export { LeftJoinCriteria } from './join/left.join-criteria.js';
export { OuterJoinCriteria } from './join/outer.join-criteria.js';
export { CriteriaTranslator } from './translator/criteria-translator.js';
export type { ICriteriaBase } from './types/criteria.interface.js';

// --- Core Interfaces (for extending or understanding) ---
export type { ICriteriaVisitor } from './types/visitor-interface.types.js';

// --- Enums & Constants ---
export { OrderDirection } from './order/order.js';
export { FilterOperator, LogicalOperator } from './types/operator.types.js';

// --- Schema Definition Types & Helpers ---
export { GetTypedCriteriaSchema } from './types/schema.types.js';
export type {
  CriteriaSchema,
  FieldOfSchema,
  JoinRelationType,
  SchemaJoins,
} from './types/schema.types.js';
export type { Cursor } from './cursor.js';
// --- Filter Definition Types ---
export type {
  FilterPrimitive,
  FilterGroupPrimitive,
  FilterValue,
  PrimitiveFilterValue,
} from './filter/types/filter-primitive.types.js';
export type { IFilterExpression } from './types/filter-expression.interface.js';
export { Filter } from './filter/filter.js';
export { FilterGroup } from './filter/filter-group.js';

export type { OrderByPrimitive } from './order/order.js';
export type { Order } from './order/order.js';

// --- Join Parameter Types (for users and translators) ---
export type {
  PivotJoinInput,
  SimpleJoinInput,
} from './types/join-input.types.js';
export type { PivotJoin, SimpleJoin } from './types/join-parameter.types.js';
export type {
  StoredJoinDetails,
  AnyJoinCriteria,
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
} from './types/join-utility.types.js';
