/**
 * useValidatedInput Hook Tests
 * 
 * Unit tests for the useValidatedInput and useValidatedForm hooks.
 * Tests validate that hooks correctly manage validation state and errors.
 * 
 * @module tests/hooks/useValidatedInput
 * @requirements 5.1 - Input validation with Zod schemas
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import {
  useValidatedInput,
  useValidatedForm,
} from '../../src/application/hooks/useValidatedInput';

describe('useValidatedInput', () => {
  // ============================================================================
  // Basic Validation Tests
  // ============================================================================

  describe('Basic Validation', () => {
    it('should initialize with null value and no errors', () => {
      const schema = z.string().email();
      const { result } = renderHook(() => useValidatedInput(schema));

      expect(result.current.value).toBeNull();
      expect(result.current.errors).toEqual([]);
      expect(result.current.isValid).toBe(false);
    });

    it('should validate valid input', () => {
      const schema = z.string().email();
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue('test@example.com');
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.value).toBe('test@example.com');
        expect(validationResult.errors).toEqual([]);
      });

      expect(result.current.value).toBe('test@example.com');
      expect(result.current.errors).toEqual([]);
      expect(result.current.isValid).toBe(true);
    });

    it('should reject invalid input', () => {
      const schema = z.string().email();
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue('not-an-email');
        expect(validationResult.isValid).toBe(false);
        expect(validationResult.value).toBeNull();
        expect(validationResult.errors.length).toBeGreaterThan(0);
      });

      expect(result.current.value).toBeNull();
      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.isValid).toBe(false);
    });

    it('should update state on multiple validations', () => {
      const schema = z.string().email();
      const { result } = renderHook(() => useValidatedInput(schema));

      // First validation - invalid
      act(() => {
        result.current.validateValue('invalid');
      });
      expect(result.current.isValid).toBe(false);

      // Second validation - valid
      act(() => {
        result.current.validateValue('valid@example.com');
      });
      expect(result.current.isValid).toBe(true);
      expect(result.current.value).toBe('valid@example.com');

      // Third validation - invalid again
      act(() => {
        result.current.validateValue('invalid-again');
      });
      expect(result.current.isValid).toBe(false);
      expect(result.current.value).toBeNull();
    });
  });

  // ============================================================================
  // Complex Schema Tests
  // ============================================================================

  describe('Complex Schema Validation', () => {
    it('should validate object schema', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().positive(),
      });
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue({
          name: 'John',
          age: 30,
        });
        expect(validationResult.isValid).toBe(true);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.value).toEqual({ name: 'John', age: 30 });
    });

    it('should reject object with missing fields', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().positive(),
      });
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue({
          name: 'John',
        });
        expect(validationResult.isValid).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.length).toBeGreaterThan(0);
    });

    it('should validate array schema', () => {
      const schema = z.array(z.string().email());
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue([
          'test1@example.com',
          'test2@example.com',
        ]);
        expect(validationResult.isValid).toBe(true);
      });

      expect(result.current.isValid).toBe(true);
    });

    it('should reject array with invalid items', () => {
      const schema = z.array(z.string().email());
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue([
          'test1@example.com',
          'not-an-email',
        ]);
        expect(validationResult.isValid).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should provide default error messages', () => {
      const schema = z.string().email();
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        result.current.validateValue('invalid');
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errors[0]).toContain('email');
    });

    it('should use custom error formatter', () => {
      const schema = z.string().email();
      const customFormatter = () => ['Custom error message'];
      const { result } = renderHook(() =>
        useValidatedInput(schema, { formatError: customFormatter })
      );

      act(() => {
        result.current.validateValue('invalid');
      });

      expect(result.current.errors).toEqual(['Custom error message']);
    });

    it('should clear errors', () => {
      const schema = z.string().email();
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        result.current.validateValue('invalid');
      });
      expect(result.current.errors.length).toBeGreaterThan(0);

      act(() => {
        result.current.clearErrors();
      });
      expect(result.current.errors).toEqual([]);
    });

    it('should provide field-specific error messages for objects', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().positive(),
      });
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        result.current.validateValue({
          email: 'invalid',
          age: -5,
        });
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      // Should have errors for both fields
      const errorString = result.current.errors.join(' ');
      expect(errorString).toContain('email');
      expect(errorString).toContain('age');
    });
  });

  // ============================================================================
  // State Management Tests
  // ============================================================================

  describe('State Management', () => {
    it('should reset to initial state', () => {
      const schema = z.string().email();
      const { result } = renderHook(() => useValidatedInput(schema));

      // Set some state
      act(() => {
        result.current.validateValue('test@example.com');
      });
      expect(result.current.isValid).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.value).toBeNull();
      expect(result.current.errors).toEqual([]);
      expect(result.current.isValid).toBe(false);
    });

    it('should maintain validation state across re-renders', () => {
      const schema = z.string().email();
      const { result, rerender } = renderHook(() => useValidatedInput(schema));

      act(() => {
        result.current.validateValue('test@example.com');
      });

      rerender();

      expect(result.current.value).toBe('test@example.com');
      expect(result.current.isValid).toBe(true);
    });
  });

  // ============================================================================
  // Security Schema Integration Tests
  // ============================================================================

  describe('Security Schema Integration', () => {
    it('should validate session ID', () => {
      const schema = z.string().uuid();
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue(
          '550e8400-e29b-41d4-a716-446655440000'
        );
        expect(validationResult.isValid).toBe(true);
      });

      expect(result.current.isValid).toBe(true);
    });

    it('should reject invalid session ID', () => {
      const schema = z.string().uuid();
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue('not-a-uuid');
        expect(validationResult.isValid).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
    });

    it('should validate chat message', () => {
      const schema = z.object({
        id: z.string().min(1),
        username: z.string().min(1).max(25),
        message: z.string().min(1).max(500),
        timestamp: z.date(),
      });
      const { result } = renderHook(() => useValidatedInput(schema));

      act(() => {
        const validationResult = result.current.validateValue({
          id: 'msg_123',
          username: 'testuser',
          message: 'Hello, world!',
          timestamp: new Date(),
        });
        expect(validationResult.isValid).toBe(true);
      });

      expect(result.current.isValid).toBe(true);
    });
  });
});

// ============================================================================
// useValidatedForm Tests
// ============================================================================

describe('useValidatedForm', () => {
  const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    age: z.number().positive().optional(),
  });

  describe('Field Validation', () => {
    it('should initialize with empty values and no errors', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      expect(result.current.values).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(false);
    });

    it('should validate individual field', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        const isValid = result.current.validateField('email', 'test@example.com');
        expect(isValid).toBe(true);
      });

      expect(result.current.values.email).toBe('test@example.com');
      expect(result.current.errors.email).toBeUndefined();
    });

    it('should reject invalid field', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        const isValid = result.current.validateField('email', 'invalid');
        expect(isValid).toBe(false);
      });

      expect(result.current.errors.email).toBeDefined();
      expect(result.current.errors.email!.length).toBeGreaterThan(0);
    });

    it('should validate multiple fields independently', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        result.current.validateField('email', 'test@example.com');
        result.current.validateField('password', 'password123');
      });

      expect(result.current.values.email).toBe('test@example.com');
      expect(result.current.values.password).toBe('password123');
      expect(Object.keys(result.current.errors)).toHaveLength(0);
    });

    it('should clear field errors when field becomes valid', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      // First, make field invalid
      act(() => {
        result.current.validateField('email', 'invalid');
      });
      expect(result.current.errors.email).toBeDefined();

      // Then, make it valid
      act(() => {
        result.current.validateField('email', 'valid@example.com');
      });
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('Form Validation', () => {
    it('should validate entire form', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        const isValid = result.current.validateAll({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(isValid).toBe(true);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.values).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should reject form with invalid fields', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        const isValid = result.current.validateAll({
          email: 'invalid',
          password: 'short',
        });
        expect(isValid).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.email).toBeDefined();
      expect(result.current.errors.password).toBeDefined();
    });

    it('should reject form with missing required fields', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        const isValid = result.current.validateAll({
          email: 'test@example.com',
        });
        expect(isValid).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.password).toBeDefined();
    });

    it('should accept form with optional fields omitted', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        const isValid = result.current.validateAll({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(isValid).toBe(true);
      });

      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Error Management', () => {
    it('should clear field errors', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        result.current.validateField('email', 'invalid');
      });
      expect(result.current.errors.email).toBeDefined();

      act(() => {
        result.current.clearFieldErrors('email');
      });
      expect(result.current.errors.email).toBeUndefined();
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      act(() => {
        result.current.validateAll({
          email: 'invalid',
          password: 'short',
        });
      });
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      act(() => {
        result.current.clearAllErrors();
      });
      expect(result.current.errors).toEqual({});
    });
  });

  describe('State Management', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useValidatedForm(formSchema));

      // Set some state
      act(() => {
        result.current.validateAll({
          email: 'test@example.com',
          password: 'password123',
        });
      });
      expect(result.current.isValid).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('Real-world Form Scenarios', () => {
    it('should handle login form validation', () => {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });
      const { result } = renderHook(() => useValidatedForm(loginSchema));

      // User types email
      act(() => {
        result.current.validateField('email', 'user@example.com');
      });
      expect(result.current.errors.email).toBeUndefined();

      // User types short password
      act(() => {
        result.current.validateField('password', 'short');
      });
      expect(result.current.errors.password).toBeDefined();

      // User fixes password
      act(() => {
        result.current.validateField('password', 'longenoughpassword');
      });
      expect(result.current.errors.password).toBeUndefined();

      // Submit form
      act(() => {
        const isValid = result.current.validateAll({
          email: 'user@example.com',
          password: 'longenoughpassword',
        });
        expect(isValid).toBe(true);
      });
    });

    it('should handle registration form with multiple validations', () => {
      const registrationSchema = z.object({
        username: z.string().min(3).max(20),
        email: z.string().email(),
        password: z.string().min(8),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
      });

      const { result } = renderHook(() => useValidatedForm(registrationSchema));

      act(() => {
        const isValid = result.current.validateAll({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
        expect(isValid).toBe(true);
      });

      expect(result.current.isValid).toBe(true);
    });
  });
});
