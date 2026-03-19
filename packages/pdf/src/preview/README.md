# PDF Template Previewer

**Development-only tool** for previewing and testing PDF templates.

## Usage

From the repository root, run:

```bash
yarn nx dev pdf
```

This will start a development server and open the previewer in your browser.

## Features

- Switch between different PDF templates using the navigation buttons
- Live preview of templates with sample data
- Hot module reload for rapid development

## Templates Available

- **Campaign Template**: Preview campaign letters with personalized content
- **Housing Template**: Preview housing information sheets

## Note

This previewer is for development purposes only and is **not included in the production build**.

Sample data is automatically generated using the shared fixtures from `@zerologementvacant/models/test/fixtures`.
