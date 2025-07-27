# Personal Website - Static Site Generator

A modern static site generator that converts markdown content to HTML using Nunjucks templates. Built with Node.js and designed for technical blogs and portfolios.

## Features

- **Markdown to HTML conversion** with front matter support
- **Nunjucks templating** engine for flexible layouts
- **Featured content** highlighting on homepage
- **Live development server** with hot reloading
- **Static asset copying** (CSS, images, etc.)
- **Easy content management** through YAML configuration

## Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- npm (comes with Node.js)

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server with live reloading:
```bash
npm run dev
```
This will:
- Build the site
- Start a local server at http://localhost:8000
- Watch for file changes and automatically rebuild

### Production Build

Generate a static version of the website:
```bash
npm run build
```

The static files will be generated in the `output/` directory.

## Project Structure

```
personal_website/
├── build.js              # Main build script
├── config.yml            # Site configuration
├── package.json           # Dependencies and scripts
├── config/              # JSON configuration files
│   ├── featured.json     # Featured content configuration
│   └── writing_types.json # Writing categories and tags
├── content/              # Markdown content
│   ├── writings/         # Blog posts
│   └── projects/         # Project pages
├── templates/            # Nunjucks templates
│   ├── base.html         # Base layout
│   ├── index.html        # Homepage template
│   ├── writings.html     # Writings list page
│   ├── writings_detail.html # Individual writing page
│   └── projects.html     # Projects list page
├── static/               # Static assets (CSS, images)
│   └── style.css         # Main stylesheet
└── output/               # Generated site (git-ignored)
```

## Content Management

### Adding New Writing

1. Create a new markdown file in `content/writings/articles/` (or appropriate category subdirectory)
2. Use this format for the markdown file:

```markdown
---
id: "unique-post-id"
title: "Your Post Title"
description: "Brief description of the post"
date: "2024-01-15"
tag: "philosophy"
read_time: "5 min read"
---

Your content here...
```

3. To feature the writing on the homepage, add its `id` to `config/featured.json`
4. Ensure the `tag` matches one of the tags defined in `config/writing_types.json` for proper categorization

### Configuration

#### Site Configuration (`config.yml`)
Edit `config.yml` to:
- Update site information (title, description, email)
- Add/remove social links
- Configure navigation

#### Featured Content (`config/featured.json`)
Control which content appears on the homepage:
```json
{
  "writings": ["slowing-time", "compounding-knowledge", "understanding-risk"],
  "projects": []
}
```

#### Writing Categories (`config/writing_types.json`)
Define categories and their associated tags:
```json
{
  "categories": {
    "articles": {
      "title": "Articles",
      "tags": ["philosophy", "investing", "productivity"],
      "description": "In-depth articles on various topics"
    }
  }
}
```

### Featured Content

To feature content on the homepage:
1. Add the content's `id` to the appropriate array in `config/featured.json`
2. For writings: add to the `writings` array
3. For projects: add to the `projects` array

Note: Content is categorized automatically based on the `tag` field matching the tags defined in `config/writing_types.json`.

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run build` | `node build.js --build` | Build static site |
| `npm run serve` | `node build.js --serve` | Serve existing build |
| `npm run dev` | `node build.js --watch --serve` | Development mode |
| `npm run watch` | `node build.js --watch` | Watch and rebuild |
| `npm start` | `npm run dev` | Alias for dev mode |

## Local Testing

### Method 1: Development Server (Recommended)
```bash
npm run dev
```
- Automatically rebuilds on changes
- Serves at http://localhost:8000
- Best for development and content editing

### Method 2: Build and Serve
```bash
npm run build
npm run serve
```
- Builds once, then serves static files
- Good for testing production builds
- Serves at http://localhost:8000

### Method 3: Manual Testing
```bash
npm run build
# Use any static file server, e.g.:
npx http-server output -p 8080
```

### Method 4: Custom Port
```bash
node build.js --serve --port 3000
```

## Deployment

### Static Hosting (Netlify, Vercel, GitHub Pages)

1. Build the site:
   ```bash
   npm run build
   ```

2. Deploy the `output/` directory to your hosting provider

3. For automated deployments, add this build command to your hosting configuration:
   ```bash
   npm install && npm run build
   ```

### Manual Deployment

1. Run `npm run build`
2. Copy the contents of the `output/` directory to your web server
3. Configure your web server to serve static files

## Customization

### Styling
- Edit `static/style.css` for visual customization
- Styles are automatically copied to the output directory

### Templates
- Modify files in `templates/` directory
- Uses Nunjucks templating syntax
- `base.html` provides the main layout structure

### Navigation
- Update the `navigation` section in `config.yml`
- Links are automatically generated in the header

## JSON Configuration Files

The site uses JSON configuration files for centralized content management:

### `config/featured.json`
Controls which content appears on the homepage. Content listed here will be prioritized over non-featured content when selecting items for the homepage display.

### `config/writing_types.json`
Defines writing categories and their associated tags. Content is automatically categorized based on the `tag` field in the frontmatter matching the tags defined here. This replaces the old directory-based categorization system.

## Troubleshooting

### Build Fails
- Ensure Node.js version is 16.0.0 or higher
- Run `npm install` to install dependencies
- Check that all markdown files have valid front matter

### Port Already in Use
- Use a different port: `node build.js --serve --port 3001`
- Or kill the process using the port

### Content Not Updating
- Make sure you're running `npm run dev` for auto-rebuilding
- Check that your markdown files are in the correct directory
- For featured content, verify the content `id` is listed in `config/featured.json`
- For categorization, ensure the `tag` field matches tags defined in `config/writing_types.json`

### CSS Not Loading
- Ensure `static/style.css` exists
- Check that the `base_url` in `config.yml` is correct
- Verify the build process copied static files

## Dependencies

### Core Dependencies
- **nunjucks**: Template engine
- **marked**: Markdown parser
- **gray-matter**: Front matter parser
- **js-yaml**: YAML configuration parser
- **express**: Development server
- **chokidar**: File watching
- **commander**: CLI interface

### Development
- **highlight.js**: Syntax highlighting (optional)

## License

MIT License - see package.json for details