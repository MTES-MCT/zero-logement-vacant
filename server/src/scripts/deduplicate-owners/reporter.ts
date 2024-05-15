import { Report } from './report';

interface Reporter {
  toString(report: Report): string;
}

class TextReporter implements Reporter {
  toString(report: Report): string {
    return Object.keys(report)
      .map((key) => `${key}: ${report[key as keyof Report]}`)
      .join('\n');
  }
}

class JSONReporter implements Reporter {
  toString(report: Report): string {
    return JSON.stringify(report);
  }
}

export function createReporter(type: 'text' | 'json'): Reporter {
  switch (type) {
    case 'text':
      return new TextReporter();
    case 'json':
      return new JSONReporter();
  }
}
