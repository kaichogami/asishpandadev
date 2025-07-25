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
├── content/              # Markdown content
│   ├── writings/         # Blog posts
│   └── projects/         # Project pages (currently hidden)
├── templates/            # Nunjucks templates
│   ├── base.html         # Base layout
│   ├── index.html        # Homepage template
│   ├── writings.html     # Writings list page
│   └── writings_detail.html # Individual writing page
├── static/               # Static assets (CSS, images)
│   └── style.css         # Main stylesheet
└── output/               # Generated site (git-ignored)
```

## Content Management

### Adding New Writing

1. Create a new markdown file in `content/writings/`
2. Add metadata to `config.yml` under the `writings` section
3. Use this format for the markdown file:

```markdown
---
title: "Your Post Title"
date: "2024-01-15"
tags: ["tag1", "tag2"]
---

Your content here...
```

### Configuration

Edit `config.yml` to:
- Update site information (title, description, email)
- Add/remove social links
- Configure navigation
- Manage content metadata

### Featured Content

Set `featured: true` in the config.yml metadata to display content on the homepage.

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

## Restoring Projects Section

The projects section is currently hidden but can be easily restored:

1. **In `build.js`**:
   - Line 175: Change `for (const contentType of ['writings']) {` to `for (const contentType of ['writings', 'projects']) {`
   - Line 272: Uncomment `await this.buildContentPages('projects');`

2. **In `templates/index.html`**:
   - Uncomment the entire "Featured Projects" section (lines 23-38)

3. **In `config.yml`**:
   - Uncomment the Projects navigation item (lines 27-29)

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
- Verify metadata in `config.yml` matches your file names

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