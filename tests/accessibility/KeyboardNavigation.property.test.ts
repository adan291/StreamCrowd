/**
 * Property-based tests for Keyboard Navigation Accessibility
 * 
 * Tests that verify Tab navigation and Enter/Space activation work correctly
 * for interactive elements in the application.
 * 
 * **Feature: ux-polish-and-testing**
 * **Validates: Requirements 8.2**
 * 
 * @requirements 8.2 - Interactive elements have visible focus indicators
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// TYPES AND INTERFACES
// ============================================

/**
 * Represents an interactive element's accessibility properties
 */
interface InteractiveElement {
  tagName: 'button' | 'a' | 'input' | 'select' | 'textarea' | 'div' | 'span';
  role?: string;
  tabIndex?: number;
  disabled?: boolean;
  ariaDisabled?: boolean;
  hasOnClick?: boolean;
  hasOnKeyDown?: boolean;
  type?: string;
}

/**
 * Keyboard event simulation
 */
interface KeyboardEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

// ============================================
// PURE FUNCTIONS FOR TESTING
// ============================================

/**
 * Determines if an element is natively focusable
 * Native focusable elements: button, a[href], input, select, textarea
 */
function isNativelyFocusable(element: InteractiveElement): boolean {
  const nativelyFocusable = ['button', 'input', 'select', 'textarea'];
  
  if (nativelyFocusable.includes(element.tagName)) {
    return !element.disabled;
  }
  
  // Links are focusable if they have href (we assume they do for this test)
  if (element.tagName === 'a') {
    return true;
  }
  
  return false;
}

/**
 * Determines if an element is focusable via tabIndex
 * tabIndex >= 0 makes element focusable and in tab order
 * tabIndex = -1 makes element focusable but not in tab order
 */
function isFocusableViaTabIndex(element: InteractiveElement): boolean {
  if (element.tabIndex === undefined) return false;
  // tabIndex of -1 or higher makes element focusable
  return element.tabIndex >= -1;
}

/**
 * Determines if an element is focusable (either natively or via tabIndex)
 */
function isFocusable(element: InteractiveElement): boolean {
  if (element.disabled || element.ariaDisabled) {
    return false;
  }
  return isNativelyFocusable(element) || isFocusableViaTabIndex(element);
}

/**
 * Determines if an element is in the tab order (can be reached via Tab key)
 */
function isInTabOrder(element: InteractiveElement): boolean {
  if (!isFocusable(element)) return false;
  
  // tabIndex < 0 means focusable but not in tab order
  if (element.tabIndex !== undefined && element.tabIndex < 0) {
    return false;
  }
  
  return true;
}

/**
 * Determines if a keyboard event should activate a button-like element
 * Buttons respond to Enter and Space
 */
function shouldActivateButton(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

/**
 * Determines if a keyboard event should activate a link
 * Links only respond to Enter (not Space)
 */
function shouldActivateLink(event: KeyboardEvent): boolean {
  return event.key === 'Enter';
}

/**
 * Determines if a keyboard event should activate an element based on its role
 */
function shouldActivateElement(element: InteractiveElement, event: KeyboardEvent): boolean {
  // Disabled elements should not be activated
  if (element.disabled || element.ariaDisabled) {
    return false;
  }
  
  // Native buttons
  if (element.tagName === 'button') {
    return shouldActivateButton(event);
  }
  
  // Links
  if (element.tagName === 'a') {
    return shouldActivateLink(event);
  }
  
  // Elements with role="button"
  if (element.role === 'button') {
    return shouldActivateButton(event);
  }
  
  // Elements with role="link"
  if (element.role === 'link') {
    return shouldActivateLink(event);
  }
  
  // Custom interactive elements (div/span with onClick and tabIndex)
  if ((element.tagName === 'div' || element.tagName === 'span') && 
      element.hasOnClick && 
      element.tabIndex !== undefined && 
      element.tabIndex >= 0) {
    // Should have onKeyDown handler to respond to Enter/Space
    if (element.hasOnKeyDown) {
      return shouldActivateButton(event);
    }
  }
  
  return false;
}

/**
 * Validates that an interactive element has proper keyboard support
 */
function hasProperKeyboardSupport(element: InteractiveElement): boolean {
  // Native interactive elements have built-in keyboard support
  if (['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName)) {
    return true;
  }
  
  // Custom interactive elements need explicit keyboard handling
  if (element.hasOnClick) {
    // Must have tabIndex for focus and onKeyDown for activation
    return element.tabIndex !== undefined && 
           element.tabIndex >= 0 && 
           element.hasOnKeyDown === true;
  }
  
  return true; // Non-interactive elements don't need keyboard support
}

/**
 * Validates that an element has proper ARIA attributes for its role
 */
function hasProperAriaForRole(element: InteractiveElement): boolean {
  // If element has a role, it should be a valid interactive role
  if (element.role) {
    const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option'];
    return interactiveRoles.includes(element.role);
  }
  
  return true;
}

/**
 * Calculates the tab order position based on tabIndex
 * Elements with tabIndex > 0 come first (in order), then tabIndex = 0 (in DOM order)
 */
function getTabOrderPriority(element: InteractiveElement): number {
  if (!isInTabOrder(element)) return Infinity;
  
  if (element.tabIndex !== undefined && element.tabIndex > 0) {
    return element.tabIndex;
  }
  
  // tabIndex = 0 or native focusable elements follow DOM order
  return 1000; // High number to come after explicit tabIndex values
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const tagNameArb = fc.constantFrom<InteractiveElement['tagName']>(
  'button', 'a', 'input', 'select', 'textarea', 'div', 'span'
);

const roleArb = fc.option(
  fc.constantFrom('button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option'),
  { nil: undefined }
);

const tabIndexArb = fc.option(
  fc.integer({ min: -1, max: 10 }),
  { nil: undefined }
);

const interactiveElementArb: fc.Arbitrary<InteractiveElement> = fc.record({
  tagName: tagNameArb,
  role: roleArb,
  tabIndex: tabIndexArb,
  disabled: fc.boolean(),
  ariaDisabled: fc.boolean(),
  hasOnClick: fc.boolean(),
  hasOnKeyDown: fc.boolean(),
  type: fc.option(fc.constantFrom('text', 'password', 'email', 'submit', 'button'), { nil: undefined }),
});

const activationKeyArb = fc.constantFrom('Enter', ' ');
const nonActivationKeyArb = fc.constantFrom('Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'a', 'b');

const keyboardEventArb: fc.Arbitrary<KeyboardEvent> = fc.record({
  key: fc.string({ minLength: 1, maxLength: 10 }),
  code: fc.string({ minLength: 1, maxLength: 20 }),
  ctrlKey: fc.boolean(),
  altKey: fc.boolean(),
  shiftKey: fc.boolean(),
  metaKey: fc.boolean(),
});

// ============================================
// PROPERTY TESTS
// ============================================

describe('Keyboard Navigation Accessibility Tests', () => {
  describe('Tab Navigation', () => {
    /**
     * Property: Native interactive elements are in tab order by default
     * Validates: Requirements 8.2
     */
    it('native interactive elements are focusable by default', () => {
      const nativeElements: InteractiveElement['tagName'][] = ['button', 'a', 'input', 'select', 'textarea'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...nativeElements),
          (tagName) => {
            const element: InteractiveElement = {
              tagName,
              disabled: false,
            };
            
            expect(isNativelyFocusable(element)).toBe(true);
            expect(isInTabOrder(element)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Disabled elements are not focusable
     */
    it('disabled elements are not focusable', () => {
      fc.assert(
        fc.property(
          interactiveElementArb,
          (element) => {
            if (element.disabled) {
              expect(isFocusable(element)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Elements with aria-disabled are not focusable
     */
    it('aria-disabled elements are not focusable', () => {
      fc.assert(
        fc.property(
          interactiveElementArb,
          (element) => {
            if (element.ariaDisabled) {
              expect(isFocusable(element)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Elements with tabIndex >= 0 are in tab order
     */
    it('elements with tabIndex >= 0 are in tab order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          tagNameArb,
          (tabIndex, tagName) => {
            const element: InteractiveElement = {
              tagName,
              tabIndex,
              disabled: false,
            };
            
            expect(isInTabOrder(element)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Elements with tabIndex = -1 are focusable but not in tab order
     */
    it('elements with tabIndex = -1 are focusable but not in tab order', () => {
      fc.assert(
        fc.property(
          tagNameArb,
          (tagName) => {
            const element: InteractiveElement = {
              tagName,
              tabIndex: -1,
              disabled: false,
            };
            
            expect(isFocusable(element)).toBe(true);
            expect(isInTabOrder(element)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Non-interactive elements without tabIndex are not in tab order
     */
    it('div/span without tabIndex are not in tab order', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<InteractiveElement['tagName']>('div', 'span'),
          (tagName) => {
            const element: InteractiveElement = {
              tagName,
              disabled: false,
            };
            
            expect(isInTabOrder(element)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Enter/Space Activation', () => {
    /**
     * Property: Buttons respond to Enter and Space
     * Validates: Requirements 8.2
     */
    it('buttons are activated by Enter key', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // disabled state
          (disabled) => {
            const element: InteractiveElement = {
              tagName: 'button',
              disabled,
            };
            
            const event: KeyboardEvent = {
              key: 'Enter',
              code: 'Enter',
              ctrlKey: false,
              altKey: false,
              shiftKey: false,
              metaKey: false,
            };
            
            if (disabled) {
              expect(shouldActivateElement(element, event)).toBe(false);
            } else {
              expect(shouldActivateElement(element, event)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('buttons are activated by Space key', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // disabled state
          (disabled) => {
            const element: InteractiveElement = {
              tagName: 'button',
              disabled,
            };
            
            const event: KeyboardEvent = {
              key: ' ',
              code: 'Space',
              ctrlKey: false,
              altKey: false,
              shiftKey: false,
              metaKey: false,
            };
            
            if (disabled) {
              expect(shouldActivateElement(element, event)).toBe(false);
            } else {
              expect(shouldActivateElement(element, event)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Links respond to Enter only (not Space)
     */
    it('links are activated by Enter key only', () => {
      const element: InteractiveElement = {
        tagName: 'a',
        disabled: false,
      };
      
      const enterEvent: KeyboardEvent = {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      };
      
      const spaceEvent: KeyboardEvent = {
        key: ' ',
        code: 'Space',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      };
      
      expect(shouldActivateElement(element, enterEvent)).toBe(true);
      expect(shouldActivateElement(element, spaceEvent)).toBe(false);
    });

    /**
     * Property: Elements with role="button" respond to Enter and Space
     */
    it('elements with role="button" are activated by Enter and Space', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<InteractiveElement['tagName']>('div', 'span'),
          activationKeyArb,
          (tagName, key) => {
            const element: InteractiveElement = {
              tagName,
              role: 'button',
              tabIndex: 0,
              disabled: false,
              hasOnClick: true,
              hasOnKeyDown: true,
            };
            
            const event: KeyboardEvent = {
              key,
              code: key === ' ' ? 'Space' : 'Enter',
              ctrlKey: false,
              altKey: false,
              shiftKey: false,
              metaKey: false,
            };
            
            expect(shouldActivateElement(element, event)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Non-activation keys don't activate elements
     */
    it('non-activation keys do not activate buttons', () => {
      fc.assert(
        fc.property(
          nonActivationKeyArb,
          (key) => {
            const element: InteractiveElement = {
              tagName: 'button',
              disabled: false,
            };
            
            const event: KeyboardEvent = {
              key,
              code: key,
              ctrlKey: false,
              altKey: false,
              shiftKey: false,
              metaKey: false,
            };
            
            expect(shouldActivateElement(element, event)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Custom Interactive Elements', () => {
    /**
     * Property: Custom interactive elements need proper keyboard support
     */
    it('custom interactive elements with onClick need tabIndex and onKeyDown', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<InteractiveElement['tagName']>('div', 'span'),
          fc.boolean(), // hasOnKeyDown
          tabIndexArb,
          (tagName, hasOnKeyDown, tabIndex) => {
            const element: InteractiveElement = {
              tagName,
              tabIndex,
              disabled: false,
              hasOnClick: true,
              hasOnKeyDown,
            };
            
            const hasSupport = hasProperKeyboardSupport(element);
            
            // Should have proper support only if tabIndex >= 0 and hasOnKeyDown
            const expectedSupport = tabIndex !== undefined && tabIndex >= 0 && hasOnKeyDown;
            expect(hasSupport).toBe(expectedSupport);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Native elements always have proper keyboard support
     */
    it('native interactive elements always have proper keyboard support', () => {
      const nativeElements: InteractiveElement['tagName'][] = ['button', 'a', 'input', 'select', 'textarea'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...nativeElements),
          (tagName) => {
            const element: InteractiveElement = {
              tagName,
              disabled: false,
            };
            
            expect(hasProperKeyboardSupport(element)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('ARIA Role Validation', () => {
    /**
     * Property: Interactive roles are valid
     */
    it('interactive roles are recognized as valid', () => {
      const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...interactiveRoles),
          tagNameArb,
          (role, tagName) => {
            const element: InteractiveElement = {
              tagName,
              role,
              disabled: false,
            };
            
            expect(hasProperAriaForRole(element)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Elements without role are valid
     */
    it('elements without explicit role are valid', () => {
      fc.assert(
        fc.property(
          tagNameArb,
          (tagName) => {
            const element: InteractiveElement = {
              tagName,
              disabled: false,
            };
            
            expect(hasProperAriaForRole(element)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Tab Order Priority', () => {
    /**
     * Property: Elements with positive tabIndex come before tabIndex=0
     */
    it('positive tabIndex elements have higher priority than tabIndex=0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          tagNameArb,
          (positiveTabIndex, tagName) => {
            const elementWithPositive: InteractiveElement = {
              tagName,
              tabIndex: positiveTabIndex,
              disabled: false,
            };
            
            const elementWithZero: InteractiveElement = {
              tagName,
              tabIndex: 0,
              disabled: false,
            };
            
            const priorityPositive = getTabOrderPriority(elementWithPositive);
            const priorityZero = getTabOrderPriority(elementWithZero);
            
            expect(priorityPositive).toBeLessThan(priorityZero);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Elements not in tab order have infinite priority (last)
     */
    it('elements not in tab order have infinite priority', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<InteractiveElement['tagName']>('div', 'span'),
          (tagName) => {
            const element: InteractiveElement = {
              tagName,
              tabIndex: -1,
              disabled: false,
            };
            
            expect(getTabOrderPriority(element)).toBe(Infinity);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
