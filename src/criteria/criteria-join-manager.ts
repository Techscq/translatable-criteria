import type { CriteriaSchema, JoinRelationType } from './types/schema.types.js';
import type { IJoinManager } from './types/manager.interface.js';
import type { PivotJoin, SimpleJoin } from './types/join-parameter.types.js';
import type {
  AnyJoinCriteria,
  StoredJoinDetails,
} from './types/join-utility.types.js';

export class CriteriaJoinManager<CSchema extends CriteriaSchema>
  implements IJoinManager<CSchema>
{
  private _joins: Map<string, StoredJoinDetails<CSchema>> = new Map();

  addJoin<JoinSchema extends CriteriaSchema>(
    criteriaToJoin: AnyJoinCriteria<JoinSchema>,
    joinParameter:
      | PivotJoin<CSchema, JoinSchema, JoinRelationType>
      | SimpleJoin<CSchema, JoinSchema, JoinRelationType>,
  ): void {
    const joinDetails: StoredJoinDetails<CSchema> = {
      parameters: joinParameter,
      criteria: criteriaToJoin,
    };

    this._joins.set(criteriaToJoin.alias, joinDetails);
  }

  getJoins(): Array<StoredJoinDetails<CSchema>> {
    return Array.from(this._joins.values());
  }
}
