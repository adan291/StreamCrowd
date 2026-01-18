# i18n Translation Validation System

This document describes the comprehensive validation system for the modular i18n translation structure.

## Overview

The validation system ensures translation completeness, consistency, and correctness between Spanish (ES) and English (EN) locales across all translation modules.

## Features

### ✅ Translation Completeness (Design P1)
- **Validates that all Spanish keys exist in English**
- Detects missing translations in either locale
- Provides detailed coverage statistics per module
- Ensures no translation keys are orphaned

### ✅ Type Consistency (Design P2)
- **Validates type consistency between locales**
- Detects when the same key has different types (string vs object)
- Ensures structural consistency across translations
- Prevents runtime type errors

### ✅ Interpolation Validation (Design P3)
- **Validates interpolation variables are consistent**
- Detects missing or extra `{{variable}}` placeholders
- Ensures variable names match between locales
- Prevents interpolation runtime errors

### 📊 Comprehensive Reporting
- Console output with color-coded results
- JSON format for programmatic integration
- Markdown format for documentation
- Detailed error descriptions and suggestions

## Files

### Core Validation (`i18n/validation.ts`)
The main TypeScript module containing all validation logic:

```typescript
import { validate, printSummary, toJSON, toMarkdown } from './i18n/validation';

// Validate all modules
const report = await validate({ verbose: true });

// Print summary to console
printSummary(report);

// Generate reports
const jsonReport = toJSON(report);
const markdownReport = toMarkdown(report);
```

### CLI Tool (`i18n/validate-cli.cjs`)
Command-line interface for running validations:

```bash
# Basic validation
node i18n/validate-cli.cjs

# Verbose output
node i18n/validate-cli.cjs --verbose

# Validate specific module
node i18n/validate-cli.cjs --module poll --verbose

# Generate markdown report
node i18n/validate-cli.cjs --format markdown --output report.md

# Generate JSON report
node i18n/validate-cli.cjs --format json --output report.json
```

## Usage Examples

### Programmatic Usage

```typescript
import validation from './i18n/validation';

// Quick validation check
const isValid = await validation.isValid();
console.log('All translations valid:', isValid);

// Validate specific module
const pollResult = await validation.validateModule('poll');
console.log('Poll module valid:', pollResult.isValid);

// Full validation with custom options
const report = await validation.validate({
  modules: ['common', 'errors', 'poll'],
  verbose: true,
  validateInterpolation: true,
  validateTypes: true
});

// Generate reports
console.log(validation.toMarkdown(report));
```

### CLI Usage

```bash
# Show help
node i18n/validate-cli.cjs --help

# Basic validation
node i18n/validate-cli.cjs

# Verbose validation
node i18n/validate-cli.cjs --verbose

# Validate specific module
node i18n/validate-cli.cjs --module poll

# Generate markdown report
node i18n/validate-cli.cjs --format markdown --output validation-report.md

# Generate JSON for CI/CD
node i18n/validate-cli.cjs --format json --output validation-results.json
```

## Validation Rules

### 1. Key Completeness
- Every key in Spanish (ES) must exist in English (EN)
- Every key in English (EN) should exist in Spanish (ES)
- Nested object structures must match between locales

### 2. Type Consistency
- String values in ES must be strings in EN
- Object values in ES must be objects in EN
- Array structures must match between locales

### 3. Interpolation Variables
- All `{{variable}}` placeholders in ES must exist in EN
- Variable names must match exactly between locales
- No extra or missing variables allowed

## Report Format

### Console Output
```
📊 i18n VALIDATION REPORT
==================================================
Status: ❌ FAILED
Modules: 6/8 valid

📈 Coverage:
  Spanish (ES): 100.0% (21/21 keys)
  English (EN): 95.0% (19/20 keys)

⚠️  Missing Keys:
  Missing in EN: 1 keys

🔗 Interpolation Issues: 2

❌ Failed Modules:

  📋 poll:
    Missing in EN: winner

  📋 giveaway:
    Interpolation issues:
      - participants: Missing variables in EN: count
```

### JSON Output
```json
{
  "isValid": false,
  "modules": [
    {
      "module": "poll",
      "missingKeys": {
        "es": [],
        "en": ["winner"]
      },
      "typeInconsistencies": [],
      "interpolationIssues": [],
      "totalKeys": {
        "es": 4,
        "en": 3
      },
      "coverage": {
        "es": 100.0,
        "en": 66.7
      },
      "isValid": false
    }
  ],
  "summary": {
    "totalModules": 8,
    "validModules": 6,
    "overallCoverage": {
      "es": 100.0,
      "en": 95.0
    }
  },
  "timestamp": "2026-01-17T11:15:11.870Z"
}
```

## Integration

### CI/CD Integration
Add validation to your build process:

```yaml
# GitHub Actions example
- name: Validate i18n translations
  run: |
    node i18n/validate-cli.cjs --format json --output validation-results.json
    if [ $? -ne 0 ]; then
      echo "Translation validation failed"
      exit 1
    fi
```

### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit
echo "Validating i18n translations..."
node i18n/validate-cli.cjs
if [ $? -ne 0 ]; then
  echo "❌ Translation validation failed. Please fix issues before committing."
  exit 1
fi
echo "✅ Translation validation passed"
```

### NPM Scripts
Add to your `package.json`:

```json
{
  "scripts": {
    "i18n:validate": "node i18n/validate-cli.cjs",
    "i18n:validate:verbose": "node i18n/validate-cli.cjs --verbose",
    "i18n:report": "node i18n/validate-cli.cjs --format markdown --output docs/i18n-validation.md"
  }
}
```

## Supported Modules

The validation system supports all translation modules:

- **Core Modules** (always loaded):
  - `common` - Common UI elements and core chat translations
  - `errors` - Error messages
  - `navigation` - Navigation and menus

- **Feature Modules** (lazy loaded):
  - `poll` - Polls and voting
  - `games` - Interactive games
  - `giveaway` - Giveaways and raffles
  - `macros` - Macro system
  - `commands` - Chat commands
  - `predictions` - Twitch predictions
  - `rewards` - Channel point rewards
  - `moderation` - Moderation tools
  - `analytics` - Analytics and metrics
  - `overlay` - OBS overlays
  - `platforms` - Platform integrations
  - `misc` - Miscellaneous features

## Error Types

### Missing Keys
```
Missing in EN: poll.winner
```
**Solution**: Add the missing translation key to the English locale file.

### Type Inconsistencies
```
Type mismatch: poll.options - ES(object) vs EN(string)
```
**Solution**: Ensure the same key has the same type in both locales.

### Interpolation Issues
```
Missing variables in EN: count
Extra variables in EN: total
```
**Solution**: Ensure variable names match exactly between locales.

## Best Practices

### 1. Run Validation Regularly
- Run validation before each commit
- Include in CI/CD pipeline
- Generate reports for documentation

### 2. Fix Issues Immediately
- Don't let validation failures accumulate
- Address missing keys as soon as they're detected
- Keep interpolation variables consistent

### 3. Use Validation in Development
- Run validation after adding new translations
- Use verbose mode to see detailed progress
- Generate reports to track translation coverage

### 4. Automate Where Possible
- Set up pre-commit hooks
- Include in build scripts
- Generate reports automatically

## Troubleshooting

### Common Issues

**Q: Validation fails with "Module not found"**
A: Ensure all translation modules exist in both `es/` and `en/` directories.

**Q: False positives for missing keys**
A: Check for typos in key names and ensure nested structure matches.

**Q: Interpolation validation too strict**
A: Variable names must match exactly. Use consistent naming conventions.

**Q: CLI script won't run**
A: Ensure you're using the `.cjs` version for CommonJS compatibility.

### Getting Help

1. Check the validation report for specific error details
2. Use `--verbose` flag for detailed output
3. Generate markdown reports for easier reading
4. Review the validation rules in this document

## Future Enhancements

- [ ] Support for pluralization validation
- [ ] Integration with translation management tools
- [ ] Automated translation suggestions
- [ ] Performance optimization for large translation files
- [ ] Support for additional locales beyond ES/EN
- [ ] Visual diff reports for translation changes