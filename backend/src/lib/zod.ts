export class ZodError extends Error {
  issues: { path: (string | number)[]; message: string }[];

  constructor(issues: { path: (string | number)[]; message: string }[]) {
    super('Zod validation error');
    this.issues = issues;
  }
}

type Refinement<T> = {
  check: (value: T) => boolean;
  message: string;
  path?: (string | number)[];
};

abstract class Schema<T> {
  protected refinements: Refinement<T>[] = [];

  refine(check: (value: T) => boolean, options: { message: string; path?: (string | number)[] }) {
    this.refinements.push({ check, ...options });
    return this;
  }

  optional() {
    return new OptionalSchema<T>(this as unknown as Schema<T | undefined>);
  }

  nullable() {
    return new NullableSchema<T | null>(this as unknown as Schema<T | null>);
  }

  default(value: T) {
    return new DefaultSchema<T>(this, value);
  }

  protected applyRefinements(value: T) {
    for (const refinement of this.refinements) {
      if (!refinement.check(value)) {
        throw new ZodError([
          {
            message: refinement.message,
            path: refinement.path ?? [],
          },
        ]);
      }
    }
  }

  abstract parse(value: unknown): T;
}

class OptionalSchema<T> extends Schema<T | undefined> {
  constructor(private inner: Schema<T>) {
    super();
  }

  parse(value: unknown): T | undefined {
    if (value === undefined) {
      return undefined;
    }
    const parsed = this.inner.parse(value);
    this.applyRefinements(parsed as T | undefined);
    return parsed;
  }
}

class DefaultSchema<T> extends Schema<T> {
  constructor(private inner: Schema<T>, private defaultValue: T) {
    super();
  }

  parse(value: unknown): T {
    const parsed = value === undefined ? this.defaultValue : this.inner.parse(value);
    this.applyRefinements(parsed);
    return parsed;
  }
}

class NullableSchema<T> extends Schema<T | null> {
  constructor(private inner: Schema<T>) {
    super();
  }

  parse(value: unknown): T | null {
    if (value === null) {
      return null;
    }
    const parsed = this.inner.parse(value);
    this.applyRefinements(parsed as T | null);
    return parsed;
  }
}

class ZString extends Schema<string> {
  private validators: ((value: string) => void)[] = [];

  parse(value: unknown): string {
    if (typeof value !== 'string') {
      throw new ZodError([{ path: [], message: 'Expected string' }]);
    }
    for (const validator of this.validators) {
      validator(value);
    }
    this.applyRefinements(value);
    return value;
  }

  uuid() {
    this.validators.push((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new ZodError([{ path: [], message: 'Invalid uuid' }]);
      }
    });
    return this;
  }

  datetime(_options?: unknown) {
    this.validators.push((value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new ZodError([{ path: [], message: 'Invalid datetime' }]);
      }
    });
    return this;
  }

  date() {
    this.validators.push((value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new ZodError([{ path: [], message: 'Invalid date' }]);
      }
    });
    return this;
  }

  min(length: number) {
    this.validators.push((value) => {
      if (value.length < length) {
        throw new ZodError([{ path: [], message: `Expected at least ${length} characters` }]);
      }
    });
    return this;
  }
}

class ZNumber extends Schema<number> {
  private validators: ((value: number) => void)[] = [];

  parse(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ZodError([{ path: [], message: 'Expected number' }]);
    }
    for (const validator of this.validators) {
      validator(value);
    }
    this.applyRefinements(value);
    return value;
  }

  int() {
    this.validators.push((value) => {
      if (!Number.isInteger(value)) {
        throw new ZodError([{ path: [], message: 'Expected integer' }]);
      }
    });
    return this;
  }

  min(minValue: number) {
    this.validators.push((value) => {
      if (value < minValue) {
        throw new ZodError([{ path: [], message: `Expected number to be at least ${minValue}` }]);
      }
    });
    return this;
  }

  max(maxValue: number) {
    this.validators.push((value) => {
      if (value > maxValue) {
        throw new ZodError([{ path: [], message: `Expected number to be at most ${maxValue}` }]);
      }
    });
    return this;
  }

  positive() {
    this.validators.push((value) => {
      if (value <= 0) {
        throw new ZodError([{ path: [], message: 'Expected number to be positive' }]);
      }
    });
    return this;
  }

  nonnegative() {
    this.validators.push((value) => {
      if (value < 0) {
        throw new ZodError([{ path: [], message: 'Expected number to be non-negative' }]);
      }
    });
    return this;
  }
}

class ZEnum<T extends [string, ...string[]]> extends Schema<T[number]> {
  private values: string[];

  constructor(values: T) {
    super();
    this.values = values;
  }

  parse(value: unknown): T[number] {
    if (typeof value !== 'string' || !this.values.includes(value)) {
      throw new ZodError([{ path: [], message: 'Invalid enum value' }]);
    }
    this.applyRefinements(value as T[number]);
    return value as T[number];
  }
}

class ZNativeEnum<T extends Record<string, string | number>> extends Schema<T[keyof T]> {
  private values: (string | number)[];

  constructor(values: T) {
    super();
    this.values = Object.values(values);
  }

  parse(value: unknown): T[keyof T] {
    if (!this.values.includes(value as string | number)) {
      throw new ZodError([{ path: [], message: 'Invalid enum value' }]);
    }
    this.applyRefinements(value as T[keyof T]);
    return value as T[keyof T];
  }
}

class ZObject<T extends Record<string, Schema<any>>> extends Schema<{ [K in keyof T]: ReturnType<T[K]['parse']> }> {
  constructor(private shape: T) {
    super();
  }

  parse(value: unknown): { [K in keyof T]: ReturnType<T[K]['parse']> } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ZodError([{ path: [], message: 'Expected object' }]);
    }

    const result: Record<string, unknown> = {};
    const issues: { path: (string | number)[]; message: string }[] = [];

    for (const key of Object.keys(this.shape)) {
      const parser = this.shape[key];
      try {
        result[key] = parser.parse((value as Record<string, unknown>)[key]);
      } catch (error) {
        const zodError = error as ZodError;
        issues.push(
          ...(zodError?.issues ?? [
            {
              path: [key],
              message: (error as Error).message,
            },
          ]).map((issue) => ({
            path: [key, ...issue.path],
            message: issue.message,
          }))
        );
      }
    }

    if (issues.length > 0) {
      throw new ZodError(issues);
    }

    const parsed = result as { [K in keyof T]: ReturnType<T[K]['parse']> };
    this.applyRefinements(parsed as never);
    return parsed;
  }
}

class ZArray<T> extends Schema<T[]> {
  constructor(private element: Schema<T>) {
    super();
  }

  parse(value: unknown): T[] {
    if (!Array.isArray(value)) {
      throw new ZodError([{ path: [], message: 'Expected array' }]);
    }

    const results: T[] = [];
    const issues: { path: (string | number)[]; message: string }[] = [];

    value.forEach((item, index) => {
      try {
        results.push(this.element.parse(item));
      } catch (error) {
        const zodError = error as ZodError;
        issues.push(
          ...(zodError?.issues ?? [
            {
              path: [index],
              message: (error as Error).message,
            },
          ]).map((issue) => ({
            path: [index, ...issue.path],
            message: issue.message,
          }))
        );
      }
    });

    if (issues.length > 0) {
      throw new ZodError(issues);
    }

    this.applyRefinements(results as never);
    return results;
  }

  nonempty() {
    return this.refine((value) => value.length > 0, {
      message: 'Expected array to be non-empty',
    });
  }
}

const zObject = <T extends Record<string, Schema<any>>>(shape: T) => new ZObject(shape);
const zString = () => new ZString();
const zNumber = () => new ZNumber();
const zArray = <T>(element: Schema<T>) => new ZArray(element);
const zEnum = <T extends [string, ...string[]]>(values: T) => new ZEnum(values);
const zNativeEnum = <T extends Record<string, string | number>>(values: T) =>
  new ZNativeEnum(values);

export const z = {
  object: zObject,
  string: zString,
  number: zNumber,
  array: zArray,
  enum: zEnum,
  nativeEnum: zNativeEnum,
};

export type AnyZodObject = ZObject<Record<string, Schema<any>>>;

