#!/usr/bin/env node

/**
 * Static Site Generator for Alex Chen's personal website.
 * Converts markdown content to HTML using Nunjucks templates.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { marked } from 'marked';
import nunjucks from 'nunjucks';
import chokidar from 'chokidar';
import express from 'express';
import { program } from 'commander';
import matter from 'gray-matter';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SiteBuilder {
    constructor(configPath = "config.yml") {
        this.configPath = configPath;
        this.config = null;
        this.setupPaths();
        this.setupNunjucks();
        this.setupMarked();
    }

    async loadConfig() {
        try {
            const configContent = await fs.readFile(this.configPath, 'utf8');
            this.config = yaml.load(configContent);
            return this.config;
        } catch (error) {
            throw new Error(`Failed to load config: ${error.message}`);
        }
    }

    setupPaths() {
        this.contentDir = path.join(process.cwd(), "content");
        this.templatesDir = path.join(process.cwd(), "templates");
        this.staticDir = path.join(process.cwd(), "static");
        this.outputDir = path.join(process.cwd(), this.config?.site?.output_dir || "output");
    }

    setupNunjucks() {
        this.env = nunjucks.configure(this.templatesDir, {
            autoescape: true,
            noCache: true
        });

        // Add custom filters
        this.env.addFilter('dateformat', this.dateformatFilter);
        this.env.addFilter('join', (arr, separator = ', ') => {
            return Array.isArray(arr) ? arr.join(separator) : arr;
        });
        
        // Add global functions for template compatibility
        this.env.addGlobal('items', (obj) => {
            if (!obj) return [];
            return Object.entries(obj).map(([key, value]) => ({ key, value }));
        });
    }

    setupMarked() {
        marked.setOptions({
            highlight: function(code, lang) {
                // You can add syntax highlighting here with a library like highlight.js
                return code;
            },
            breaks: false,
            gfm: true,
            tables: true,
            sanitize: false
        });
    }

    dateformatFilter(dateString, format = '%B %d, %Y') {
        if (typeof dateString === 'string') {
            const date = new Date(dateString);
            // Simple date formatting - you might want to use a library like date-fns
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            return date.toLocaleDateString('en-US', options);
        }
        return dateString;
    }

    async readMarkdownFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // Parse frontmatter and content
            const { data: metadata, content: markdownContent } = matter(content);
            
            // Convert markdown to HTML
            const htmlContent = marked(markdownContent);
            
            return { htmlContent, metadata };
        } catch (error) {
            throw new Error(`Failed to read markdown file ${filePath}: ${error.message}`);
        }
    }

    async getContentMetadata(contentType) {
        const contentDir = path.join(this.contentDir, contentType);
        const contentItems = [];
        
        try {
            await fs.access(contentDir);
            const files = await fs.readdir(contentDir);
            const mdFiles = files.filter(file => file.endsWith('.md'));

            for (const mdFile of mdFiles) {
                const filePath = path.join(contentDir, mdFile);
                const contentId = path.basename(mdFile, '.md');
                
                try {
                    const { metadata } = await this.readMarkdownFile(filePath);
                    // Ensure the metadata has an id field
                    metadata.id = metadata.id || contentId;
                    contentItems.push(metadata);
                } catch (error) {
                    console.warn(`Warning: Could not read metadata from ${mdFile}: ${error.message}`);
                }
            }
            
            // Sort by date (newest first)
            contentItems.sort((a, b) => {
                const dateA = new Date(a.date || '1970-01-01');
                const dateB = new Date(b.date || '1970-01-01');
                return dateB - dateA;
            });
            
        } catch (error) {
            console.warn(`Warning: ${contentDir} doesn't exist or couldn't be read`);
        }
        
        return contentItems;
    }

    async buildContentPages(contentType) {
        const contentDir = path.join(this.contentDir, contentType);
        
        try {
            await fs.access(contentDir);
        } catch {
            console.warn(`Warning: ${contentDir} doesn't exist`);
            return;
        }

        // Create output directory for this content type
        const outputContentDir = path.join(this.outputDir, contentType);
        await fs.mkdir(outputContentDir, { recursive: true });

        // Process each markdown file
        const files = await fs.readdir(contentDir);
        const mdFiles = files.filter(file => file.endsWith('.md'));

        for (const mdFile of mdFiles) {
            const contentId = path.basename(mdFile, '.md');
            const filePath = path.join(contentDir, mdFile);

            try {
                // Read markdown content and metadata
                const { htmlContent, metadata } = await this.readMarkdownFile(filePath);

                // Ensure metadata has required fields
                metadata.id = metadata.id || contentId;

                // Render template
                const templateName = `${contentType}_detail.html`;
                const rendered = this.env.render(templateName, {
                    config: this.config,
                    content: htmlContent,
                    metadata: metadata,
                    content_type: contentType,
                    current_page: contentType
                });

                // Write output file
                const outputFile = path.join(outputContentDir, `${contentId}.html`);
                await fs.writeFile(outputFile, rendered, 'utf8');

                console.log(`Built ${contentType}/${contentId}.html`);
            } catch (error) {
                console.error(`Error building ${contentType}/${contentId}: ${error.message}`);
            }
        }
    }

    async buildListPages() {
        // Temporarily disabled projects - uncomment line below to restore
        // for (const contentType of ['writings', 'projects']) {
        for (const contentType of ['writings']) {
            try {
                // Get content metadata from files instead of config
                const contentItems = await this.getContentMetadata(contentType);
                
                const templateName = `${contentType}.html`;
                const rendered = this.env.render(templateName, {
                    config: this.config,
                    content_items: contentItems,
                    current_page: contentType
                });

                const outputFile = path.join(this.outputDir, `${contentType}.html`);
                await fs.writeFile(outputFile, rendered, 'utf8');

                console.log(`Built ${contentType}.html`);
            } catch (error) {
                console.error(`Error building ${contentType} list page: ${error.message}`);
            }
        }
    }

    async buildIndex() {
        try {
            // Get featured content from files instead of config
            const allWritings = await this.getContentMetadata('writings');
            const featuredWritings = allWritings
                .filter(w => w.featured)
                .slice(0, 2);
            
            const allProjects = await this.getContentMetadata('projects');
            const featuredProjects = allProjects
                .filter(p => p.featured)
                .slice(0, 2);

            const rendered = this.env.render('index.html', {
                config: this.config,
                featured_writings: featuredWritings,
                featured_projects: featuredProjects,
                current_page: 'home'
            });

            const outputFile = path.join(this.outputDir, "index.html");
            await fs.writeFile(outputFile, rendered, 'utf8');

            console.log("Built index.html");
        } catch (error) {
            console.error(`Error building index: ${error.message}`);
        }
    }

    async copyStaticFiles() {
        try {
            await fs.access(this.staticDir);
            
            const staticOutput = path.join(this.outputDir, "static");
            
            // Remove existing static directory
            try {
                await fs.rm(staticOutput, { recursive: true, force: true });
            } catch {
                // Directory doesn't exist, that's fine
            }

            // Copy static files
            await this.copyDirectory(this.staticDir, staticOutput);
            console.log("Copied static files");
        } catch {
            console.warn("No static directory found, skipping static file copy");
        }
    }

    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    async build() {
        console.log("Building site...");

        try {
            // Ensure config is loaded
            if (!this.config) {
                await this.loadConfig();
                this.setupPaths(); // Re-setup paths with loaded config
            }

            // Create output directory
            await fs.mkdir(this.outputDir, { recursive: true });

            // Build content pages
            await this.buildContentPages('writings');
            // Temporarily disabled projects - uncomment line below to restore
            // await this.buildContentPages('projects');

            // Build list pages
            await this.buildListPages();

            // Build index page
            await this.buildIndex();

            // Copy static files
            await this.copyStaticFiles();

            console.log(`Site built successfully in ${this.outputDir}`);
        } catch (error) {
            console.error(`Build failed: ${error.message}`);
            throw error;
        }
    }
}

class BuildHandler {
    constructor(builder) {
        this.builder = builder;
    }

    async onChange(filePath) {
        // Only rebuild on relevant file changes
        const ext = path.extname(filePath);
        const relevantExtensions = ['.md', '.html', '.css', '.yml', '.yaml', '.js'];
        
        if (!relevantExtensions.includes(ext)) {
            return;
        }

        console.log(`File changed: ${filePath}`);
        try {
            await this.builder.loadConfig();
            await this.builder.build();
        } catch (error) {
            console.error(`Build error: ${error.message}`);
        }
    }
}

async function servesite(port = 8000, directory = "output") {
    const app = express();
    
    // Serve static files from the output directory
    app.use(express.static(path.resolve(directory)));
    
    // Handle client-side routing (serve index.html for unknown routes)
app.get('*', (req, res) => {
    const filePath = path.resolve(directory, 'index.html');
    res.sendFile(filePath);
});

    return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`Serving at http://localhost:${port}`);
            resolve(server);
        });

        server.on('error', reject);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\nStopping server...');
            server.close(() => {
                process.exit(0);
            });
        });
    });
}

async function main() {
    program
        .name('build')
        .description('Static Site Generator')
        .option('--build', 'Build the site')
        .option('--serve', 'Serve the site locally')
        .option('--watch', 'Watch for changes and rebuild')
        .option('--port <number>', 'Port for local server', '8000')
        .option('--config <path>', 'Configuration file', 'config.yml')
        .parse();

    const options = program.opts();

    if (!options.build && !options.serve && !options.watch) {
        program.help();
        return;
    }

    const builder = new SiteBuilder(options.config);

    try {
        if (options.build || options.watch) {
            await builder.build();
        }

        if (options.watch) {
            console.log("Watching for changes... Press Ctrl+C to stop");

            const handler = new BuildHandler(builder);
            const watcher = chokidar.watch('.', {
                ignored: ['node_modules/**', 'output/**', '.git/**'],
                persistent: true
            });

            watcher.on('change', (filePath) => {
                handler.onChange(filePath);
            });

            if (options.serve) {
                await servesite(parseInt(options.port), builder.outputDir);
            } else {
                // Keep the process alive
                await new Promise(() => {});
            }
        } else if (options.serve) {
            await servesite(parseInt(options.port), builder.outputDir);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { SiteBuilder, BuildHandler, servesite };