import { describe, it, expect } from 'vitest';
import { BaseModel, Field, isUUID, Min } from '@rybosome/type-a';

describe('BaseModel', () => {
  class User extends BaseModel.withSchema({
    id: Field<string>({ logical: isUUID }),
    age: Field<number>({ logical: Min(18) }),
    active: Field<boolean>({}),
  }) {};

  it('constructs and exposes fields with correct types', () => {
    const u = new User({ id: '123e4567-e89b-12d3-a456-426614174000', age: 30, active: true });

    // ✅ Type-safe access
    expect(u.id).toBeTypeOf('string');
    expect(u.age).toBeTypeOf('number');
    expect(u.active).toBe(true);
  });

  it('returns validation errors for bad inputs', () => {
    const u = new User({ id: 'not-a-uuid', age: 10, active: false });

    const errors = u.validate();
    expect(errors).toContain('id: Invalid UUID');
    expect(errors).toContain('age: Must be >= 18');
  });

  it('serializes to JSON correctly', () => {
    const u = new User({ id: 'abc', age: 20, active: true });
    expect(u.toJSON()).toEqual({ id: 'abc', age: 20, active: true });
  });

  it('updates values through setters', () => {
    const u = new User({ id: 'abc', age: 20, active: false });
    u.age = 45;
    expect(u.age).toBe(45);
  });
});
