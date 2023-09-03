import { Comparison } from './comparison';

interface ConstructorOptions {
  comparison: Comparison;
  origin: Error;
}

export class ComparisonMergeError extends Error {
  private readonly comparison: Comparison;
  private readonly origin: Error;

  constructor(opts: ConstructorOptions) {
    super('Comparison error');
    this.comparison = opts.comparison;
    this.origin = opts.origin;
  }

  toJSON() {
    return {
      message: this.message,
      name: this.message,
      comparison: this.comparison,
      origin: this.origin,
    };
  }
}
