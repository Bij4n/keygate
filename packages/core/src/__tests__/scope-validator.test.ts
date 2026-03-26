import { describe, it, expect } from 'vitest';
import { ScopeValidator } from '../scope-validator.js';
import type { TokenScope } from '../types.js';

describe('ScopeValidator', () => {
  describe('validate', () => {
    const allowed: TokenScope[] = [
      { resource: 'repos', actions: ['read', 'write'] },
      { resource: 'users', actions: ['read'] },
    ];

    it('passes for valid subset of scopes', () => {
      const requested: TokenScope[] = [
        { resource: 'repos', actions: ['read'] },
      ];
      const result = ScopeValidator.validate(requested, allowed);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails for unknown resource', () => {
      const requested: TokenScope[] = [
        { resource: 'billing', actions: ['read'] },
      ];
      const result = ScopeValidator.validate(requested, allowed);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('billing');
    });

    it('fails for disallowed action on known resource', () => {
      const requested: TokenScope[] = [
        { resource: 'users', actions: ['write'] },
      ];
      const result = ScopeValidator.validate(requested, allowed);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('write');
    });

    it('reports multiple errors', () => {
      const requested: TokenScope[] = [
        { resource: 'unknown', actions: ['read'] },
        { resource: 'users', actions: ['delete'] },
      ];
      const result = ScopeValidator.validate(requested, allowed);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('intersect', () => {
    it('returns only overlapping scopes and actions', () => {
      const requested: TokenScope[] = [
        { resource: 'repos', actions: ['read', 'delete'] },
        { resource: 'billing', actions: ['read'] },
      ];
      const maximum: TokenScope[] = [
        { resource: 'repos', actions: ['read', 'write'] },
      ];

      const result = ScopeValidator.intersect(requested, maximum);
      expect(result).toHaveLength(1);
      expect(result[0].resource).toBe('repos');
      expect(result[0].actions).toEqual(['read']);
    });

    it('returns empty for no overlap', () => {
      const requested: TokenScope[] = [
        { resource: 'billing', actions: ['read'] },
      ];
      const maximum: TokenScope[] = [
        { resource: 'repos', actions: ['read'] },
      ];
      expect(ScopeValidator.intersect(requested, maximum)).toHaveLength(0);
    });

    it('merges constraints', () => {
      const requested: TokenScope[] = [
        { resource: 'repos', actions: ['read'], constraints: { org: 'acme' } },
      ];
      const maximum: TokenScope[] = [
        { resource: 'repos', actions: ['read'], constraints: { public: true } },
      ];
      const result = ScopeValidator.intersect(requested, maximum);
      expect(result[0].constraints).toEqual({ public: true, org: 'acme' });
    });
  });

  describe('isPermitted', () => {
    const scopes: TokenScope[] = [
      { resource: 'repos', actions: ['read', 'write'] },
      { resource: 'users', actions: ['read'] },
    ];

    it('returns true for permitted action', () => {
      expect(ScopeValidator.isPermitted(scopes, 'repos', 'read')).toBe(true);
      expect(ScopeValidator.isPermitted(scopes, 'repos', 'write')).toBe(true);
      expect(ScopeValidator.isPermitted(scopes, 'users', 'read')).toBe(true);
    });

    it('returns false for unpermitted action', () => {
      expect(ScopeValidator.isPermitted(scopes, 'users', 'write')).toBe(false);
      expect(ScopeValidator.isPermitted(scopes, 'billing', 'read')).toBe(false);
    });
  });
});
