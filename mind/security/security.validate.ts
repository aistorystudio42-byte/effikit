/**
 * @keywords    input validation, sanitization, XSS prevention, SQL injection, schema validation, content security
 * @domain      Security Validate
 * @use-when    Validating and sanitizing user input at system boundaries to prevent injection attacks
 * @not-when    Internal function arguments between trusted modules — only validate at external boundaries
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationRule<T = unknown> {
  name: string;
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; rule: string; message: string }>;
}

export interface SchemaField {
  type: "string" | "number" | "boolean" | "array" | "object" | "email" | "url" | "uuid";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  items?: SchemaField;     // For array type
  properties?: Schema;     // For object type
  enum?: unknown[];
  sanitize?: boolean;      // Auto-sanitize string fields
}

export type Schema = Record<string, SchemaField>;

// ─── String Sanitization ──────────────────────────────────────────────────────

export const Sanitize = {
  /** Escape HTML special characters to prevent XSS */
  html(input: string): string {
    return input
      .replace(/&/g,  "&amp;")
      .replace(/</g,  "&lt;")
      .replace(/>/g,  "&gt;")
      .replace(/"/g,  "&quot;")
      .replace(/'/g,  "&#x27;")
      .replace(/\//g, "&#x2F;");
  },

  /** Strip all HTML tags */
  stripTags(input: string): string {
    return input.replace(/<[^>]*>/g, "");
  },

  /** Remove null bytes and control characters */
  controlChars(input: string): string {
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  },

  /** Normalize whitespace: collapse multiple spaces, trim */
  whitespace(input: string): string {
    return input.replace(/\s+/g, " ").trim();
  },

  /** Escape characters that are dangerous in SQL (for parameterized queries, prefer prepared statements) */
  sqlLike(input: string): string {
    return input.replace(/'/g, "''").replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  },

  /** Escape regex special characters in user input used in RegExp constructor */
  regex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  /** Truncate to max length without cutting multi-byte chars */
  truncate(input: string, maxLength: number): string {
    if (input.length <= maxLength) return input;
    return [...input].slice(0, maxLength).join("");
  },

  /** Comprehensive input sanitization: strip tags + control chars + normalize whitespace */
  userInput(input: string, maxLength = 10_000): string {
    return Sanitize.truncate(
      Sanitize.whitespace(Sanitize.controlChars(Sanitize.stripTags(input))),
      maxLength
    );
  },
};

// ─── Pattern Validators ───────────────────────────────────────────────────────

const PATTERNS = {
  email:      /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
  url:        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
  uuid:       /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug:       /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  phone:      /^\+?[1-9]\d{1,14}$/,    // E.164 format
  ipv4:       /^(\d{1,3}\.){3}\d{1,3}$/,
  hexColor:   /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/,
  jwt:        /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/,
};

export const Validate = {
  email:       (v: string): boolean => PATTERNS.email.test(v),
  url:         (v: string): boolean => PATTERNS.url.test(v),
  uuid:        (v: string): boolean => PATTERNS.uuid.test(v),
  slug:        (v: string): boolean => PATTERNS.slug.test(v),
  phone:       (v: string): boolean => PATTERNS.phone.test(v),
  alphanumeric:(v: string): boolean => PATTERNS.alphanumeric.test(v),
  ipv4:        (v: string): boolean => {
    if (!PATTERNS.ipv4.test(v)) return false;
    return v.split(".").every((n) => {
      if (n.length > 1 && n.startsWith("0")) return false; // leading zero
      return parseInt(n, 10) <= 255;
    });
  },
  hexColor:    (v: string): boolean => PATTERNS.hexColor.test(v),
  jwt:         (v: string): boolean => PATTERNS.jwt.test(v),

  /** Check for potential XSS patterns */
  noXSS: (v: string): boolean =>
    !/<script|javascript:|on\w+\s*=|<iframe|<object|<embed|<link|<meta|data:text\/html|vbscript:|expression\(/i.test(v),

  /** Check for potential SQL injection patterns */
  noSQLInjection: (v: string): boolean =>
    !/(union\s+select|drop\s+table|insert\s+into|delete\s+from|;--|\/\*|\*\/|xp_|exec\s*\()/i.test(v),

  /** Check for path traversal attempts */
  noPathTraversal: (v: string): boolean =>
    !(/\.\.[/\\]/.test(v) || v.includes("%2e%2e") || v.includes("%252e")),

  /** Validate content is within safe length bounds */
  length: (v: string, min: number, max: number): boolean =>
    v.length >= min && v.length <= max,
};

// ─── Schema Validator ──────────────────────────────────────────────────────────

export class SchemaValidator {
  private schema: Schema;

  constructor(schema: Schema) {
    this.schema = schema;
  }

  validate(data: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    this.validateObject(data, this.schema, "", errors);
    return { valid: errors.length === 0, errors };
  }

  /** Validate and sanitize input — returns sanitized version or throws */
  sanitizeAndValidate(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = this.sanitize(data);
    const result = this.validate(sanitized);
    if (!result.valid) {
      throw new ValidationError("Validation failed", result.errors);
    }
    return sanitized;
  }

  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [field, schema] of Object.entries(this.schema)) {
      const value = data[field];
      if (typeof value === "string" && schema.sanitize !== false) {
        result[field] = Sanitize.userInput(value, schema.maxLength ?? 10_000);
      } else {
        result[field] = value;
      }
    }

    return result;
  }

  private validateObject(
    data: Record<string, unknown>,
    schema: Schema,
    prefix: string,
    errors: ValidationResult["errors"]
  ): void {
    for (const [field, def] of Object.entries(schema)) {
      const fullField = prefix ? `${prefix}.${field}` : field;
      const value = data[field];

      if (value === undefined || value === null) {
        if (def.required) errors.push({ field: fullField, rule: "required", message: `${fullField} is required` });
        continue;
      }

      this.validateField(value, def, fullField, errors);
    }
  }

  private validateField(
    value: unknown,
    def: SchemaField,
    field: string,
    errors: ValidationResult["errors"]
  ): void {
    const addError = (rule: string, msg: string) => errors.push({ field, rule, message: msg });

    // Enum check (works for any type)
    if (def.enum && !def.enum.includes(value)) {
      addError("enum", `${field} must be one of: ${def.enum.join(", ")}`);
      return;
    }

    switch (def.type) {
      case "string":
      case "email":
      case "url":
      case "uuid": {
        if (typeof value !== "string") { addError("type", `${field} must be a string`); return; }
        if (def.minLength !== undefined && value.length < def.minLength)
          addError("minLength", `${field} must be at least ${def.minLength} characters`);
        if (def.maxLength !== undefined && value.length > def.maxLength)
          addError("maxLength", `${field} must be at most ${def.maxLength} characters`);
        if (def.pattern && !def.pattern.test(value))
          addError("pattern", `${field} does not match required pattern`);
        if (def.type === "email" && !Validate.email(value))
          addError("email", `${field} must be a valid email address`);
        if (def.type === "url" && !Validate.url(value))
          addError("url", `${field} must be a valid URL`);
        if (def.type === "uuid" && !Validate.uuid(value))
          addError("uuid", `${field} must be a valid UUID`);
        if (!Validate.noXSS(value))
          addError("xss", `${field} contains disallowed content`);
        break;
      }
      case "number": {
        if (typeof value !== "number" || isNaN(value)) { addError("type", `${field} must be a number`); return; }
        if (def.min !== undefined && value < def.min) addError("min", `${field} must be >= ${def.min}`);
        if (def.max !== undefined && value > def.max) addError("max", `${field} must be <= ${def.max}`);
        break;
      }
      case "boolean": {
        if (typeof value !== "boolean") addError("type", `${field} must be a boolean`);
        break;
      }
      case "array": {
        if (!Array.isArray(value)) { addError("type", `${field} must be an array`); return; }
        if (def.minLength !== undefined && value.length < def.minLength)
          addError("minLength", `${field} must have at least ${def.minLength} items`);
        if (def.maxLength !== undefined && value.length > def.maxLength)
          addError("maxLength", `${field} must have at most ${def.maxLength} items`);
        if (def.items) {
          value.forEach((item, i) => this.validateField(item, def.items!, `${field}[${i}]`, errors));
        }
        break;
      }
      case "object": {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          addError("type", `${field} must be an object`); return;
        }
        if (def.properties) {
          this.validateObject(value as Record<string, unknown>, def.properties, field, errors);
        }
        break;
      }
    }
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly errors: ValidationResult["errors"]) {
    super(message);
    this.name = "ValidationError";
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createValidator(schema: Schema): SchemaValidator {
  return new SchemaValidator(schema);
}

/*
 * Usage Example:
 *
 * const validator = createValidator({
 *   name:     { type: "string",  required: true,  minLength: 2, maxLength: 100 },
 *   email:    { type: "email",   required: true },
 *   age:      { type: "number",  required: false, min: 0, max: 150 },
 *   role:     { type: "string",  enum: ["admin", "user", "guest"] },
 *   website:  { type: "url",     required: false },
 * });
 *
 * const { valid, errors } = validator.validate({ name: "Alice", email: "alice@example.com", role: "admin" });
 * // valid: true
 *
 * // Sanitize + validate (auto-strips HTML from strings)
 * const clean = validator.sanitizeAndValidate(req.body);
 * // Throws ValidationError if invalid, returns sanitized object if valid
 */
