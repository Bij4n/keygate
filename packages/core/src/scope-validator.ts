import type { TokenScope } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ScopeValidator {
  static validate(
    requested: TokenScope[],
    allowed: TokenScope[],
  ): ValidationResult {
    const errors: string[] = [];

    for (const scope of requested) {
      const matching = allowed.find((a) => a.resource === scope.resource);
      if (!matching) {
        errors.push(
          `Resource "${scope.resource}" is not available on this connection`,
        );
        continue;
      }

      for (const action of scope.actions) {
        if (!matching.actions.includes(action)) {
          errors.push(
            `Action "${action}" is not permitted on resource "${scope.resource}"`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  static intersect(
    requested: TokenScope[],
    maximum: TokenScope[],
  ): TokenScope[] {
    return requested
      .map((scope) => {
        const max = maximum.find((m) => m.resource === scope.resource);
        if (!max) return null;

        const actions = scope.actions.filter((a) => max.actions.includes(a));
        if (actions.length === 0) return null;

        return {
          resource: scope.resource,
          actions,
          constraints: { ...max.constraints, ...scope.constraints },
        };
      })
      .filter((s): s is TokenScope => s !== null);
  }

  static isPermitted(
    scopes: TokenScope[],
    resource: string,
    action: 'read' | 'write' | 'delete' | 'admin',
  ): boolean {
    return scopes.some(
      (s) => s.resource === resource && s.actions.includes(action),
    );
  }
}
