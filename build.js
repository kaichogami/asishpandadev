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
            
            // Load JSON configuration files
            try {
                const featuredConfigContent = await fs.readFile('./config/featured.json', 'utf8');
                this.featuredConfig = JSON.parse(featuredConfigContent);
                console.log('Loaded featured.json successfully');
            } catch (error) {
                console.warn(`Warning: Could not load featured.json: ${error.message}`);
                this.featuredConfig = { writings: [], projects: [] };
            }
            
            try {
                const writingTypesConfigContent = await fs.readFile('./config/writing_types.json', 'utf8');
                this.writingTypesConfig = JSON.parse(writingTypesConfigContent);
                console.log('Loaded writing_types.json successfully');
            } catch (error) {
                console.warn(`Warning: Could not load writing_types.json: ${error.message}`);
                this.writingTypesConfig = { categories: {} };
            }
            
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
            await this.scanContentDirectory(contentDir, contentItems, contentType);
            
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

    async scanContentDirectory(dir, contentItems, contentType, category = null) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // If this is a subdirectory under content/writings/, treat it as a category
                const subdirCategory = category || (contentType === 'writings' ? entry.name : null);
                await this.scanContentDirectory(fullPath, contentItems, contentType, subdirCategory);
            } else if (entry.name.endsWith('.md')) {
                const contentId = path.basename(entry.name, '.md');
                
                try {
                    const { metadata } = await this.readMarkdownFile(fullPath);
                    // Ensure the metadata has an id field
                    metadata.id = metadata.id || contentId;
                    
                    // Set category from directory structure if not in frontmatter
                    if (category && !metadata.category) {
                        metadata.category = category;
                    }
                    
                    contentItems.push(metadata);
                } catch (error) {
                    console.warn(`Warning: Could not read metadata from ${entry.name}: ${error.message}`);
                }
            }
        }
    }

    groupContentByConfigCategories(contentItems) {
        const grouped = {};
        const categories = this.writingTypesConfig?.categories || {};
        
        // Initialize all config-defined categories
        for (const categoryKey of Object.keys(categories)) {
            grouped[categoryKey] = [];
        }
        
        // Assign content to categories based on tag matching
        for (const item of contentItems) {
            let assigned = false;
            
            // Check each category to see if the item's tag matches
            for (const [categoryKey, categoryConfig] of Object.entries(categories)) {
                if (categoryConfig.tags && categoryConfig.tags.includes(item.tag)) {
                    grouped[categoryKey].push(item);
                    assigned = true;
                    break; // Assign to first matching category only
                }
            }
            
            // If no category matched, skip the item or handle as needed
            if (!assigned) {
                console.warn(`Content item "${item.id}" with tag "${item.tag}" doesn't match any configured category`);
            }
        }
        
        return grouped;
    }

    getUniqueTagsForCategory(contentItems, category) {
        // Scan actual content to find which tags have writings
        const tags = new Set();
        for (const item of contentItems) {
            // Check if item belongs to this category (by tag matching logic)
            const categoryConfig = this.writingTypesConfig?.categories?.[category];
            if (categoryConfig && categoryConfig.tags && categoryConfig.tags.includes(item.tag)) {
                tags.add(item.tag);
            }
        }
        return Array.from(tags).sort();
    }

    selectHomePageContent(allWritings, allProjects) {
        // Helper function to sort content with featured items first, then by date
        const sortByFeaturedThenDate = (items, contentType) => {
            return items.sort((a, b) => {
                // Check if items are featured based on config
                const featuredArray = contentType === 'writings' ? 
                    (this.featuredConfig?.writings || []) : 
                    (this.featuredConfig?.projects || []);
                
                const aFeatured = featuredArray.includes(a.id);
                const bFeatured = featuredArray.includes(b.id);
                
                // Featured items come first
                if (aFeatured && !bFeatured) return -1;
                if (!aFeatured && bFeatured) return 1;
                
                // If both are featured or both are not featured, sort by date
                const dateA = new Date(a.date || '1970-01-01');
                const dateB = new Date(b.date || '1970-01-01');
                return dateB - dateA;
            });
        };

        // Sort both content types using config-based featured detection
        const sortedWritings = sortByFeaturedThenDate([...allWritings], 'writings');
        const sortedProjects = sortByFeaturedThenDate([...allProjects], 'projects');

        let homeWritings = [];
        let homeProjects = [];
        let hasProjects = sortedProjects.length > 0;

        // Apply quota logic
        if (sortedWritings.length > 0 && sortedProjects.length > 0) {
            // Both types exist: take up to 5 of each
            homeWritings = sortedWritings.slice(0, 5);
            homeProjects = sortedProjects.slice(0, 5);
        } else if (sortedWritings.length > 0) {
            // Only writings exist: take up to 10
            homeWritings = sortedWritings.slice(0, 10);
        } else if (sortedProjects.length > 0) {
            // Only projects exist: take up to 10
            homeProjects = sortedProjects.slice(0, 10);
        }

        return {
            homeWritings,
            homeProjects,
            hasProjects
        };
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

        // Process each markdown file recursively
        await this.buildContentPagesRecursive(contentDir, outputContentDir, contentType);
    }

    async buildContentPagesRecursive(dir, outputDir, contentType) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // Create corresponding output directory
                const subOutputDir = path.join(outputDir, entry.name);
                await fs.mkdir(subOutputDir, { recursive: true });
                
                // Recursively process subdirectory
                await this.buildContentPagesRecursive(fullPath, subOutputDir, contentType);
            } else if (entry.name.endsWith('.md')) {
                const contentId = path.basename(entry.name, '.md');

                try {
                    // Read markdown content and metadata
                    const { htmlContent, metadata } = await this.readMarkdownFile(fullPath);

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
                    const outputFile = path.join(outputDir, `${contentId}.html`);
                    await fs.writeFile(outputFile, rendered, 'utf8');

                    console.log(`Built ${contentType}/${path.relative(this.contentDir, fullPath).replace('.md', '.html')}`);
                } catch (error) {
                    console.error(`Error building ${contentType}/${contentId}: ${error.message}`);
                }
            }
        }
    }

    async buildPaginatedCategoryPages(contentType = 'writings', itemsPerPage = 10) {
        try {
            // Get content metadata from files
            const contentItems = await this.getContentMetadata(contentType);
            
            // Group content by config categories instead of directory structure
            const groupedContent = this.groupContentByConfigCategories(contentItems);
            const categories = Object.keys(groupedContent);
            const categoryConfigs = this.writingTypesConfig?.categories || {};
            
            // Get pagination config from config.yml or use defaults
            const paginationConfig = this.config?.pagination || {};
            const actualItemsPerPage = paginationConfig.items_per_page || itemsPerPage;
            
            // Build category pages - only for categories with content
            for (const category of categories) {
                const categoryItems = groupedContent[category];
                
                // Skip categories with no content
                if (!categoryItems || categoryItems.length === 0) {
                    console.log(`Skipping category "${category}" - no content found`);
                    continue;
                }
                
                const totalPages = Math.ceil(categoryItems.length / actualItemsPerPage);
                const categoryConfig = categoryConfigs[category] || {};
                
                for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
                    const startIndex = (currentPage - 1) * actualItemsPerPage;
                    const endIndex = startIndex + actualItemsPerPage;
                    const pageItems = categoryItems.slice(startIndex, endIndex);
                    
                    // Build pagination context
                    const paginationContext = {
                        current_page_number: currentPage,
                        total_pages: totalPages,
                        has_next_page: currentPage < totalPages,
                        has_prev_page: currentPage > 1,
                        next_page_url: currentPage < totalPages ? 
                            (currentPage === 1 ? `/${contentType}/${category}/page/2/` : `/${contentType}/${category}/page/${currentPage + 1}/`) : null,
                        prev_page_url: currentPage > 1 ? 
                            (currentPage === 2 ? `/${contentType}/${category}.html` : `/${contentType}/${category}/page/${currentPage - 1}/`) : null,
                        page_items: pageItems,
                        current_category: category,
                        available_categories: categories.filter(cat => groupedContent[cat] && groupedContent[cat].length > 0).map(cat => ({
                            key: cat,
                            title: categoryConfigs[cat]?.title || cat,
                            description: categoryConfigs[cat]?.description || ''
                        })),
                        available_tags: this.getUniqueTagsForCategory(contentItems, category),
                        current_tag: null,
                        category_config: categoryConfig
                    };
                    
                    const templateName = `${contentType}.html`;
                    const rendered = this.env.render(templateName, {
                        config: this.config,
                        content_items: contentItems, // Keep for compatibility
                        ...paginationContext,
                        current_page: contentType
                    });
                    
                    // Determine output path
                    let outputPath;
                    if (currentPage === 1) {
                        if (category === 'articles') {
                            // Default category goes to main writings page
                            outputPath = path.join(this.outputDir, `${contentType}.html`);
                        } else {
                            outputPath = path.join(this.outputDir, `${contentType}`, `${category}.html`);
                        }
                    } else {
                        const pageDir = path.join(this.outputDir, contentType, category, 'page', currentPage.toString());
                        await fs.mkdir(pageDir, { recursive: true });
                        outputPath = path.join(pageDir, 'index.html');
                    }
                    
                    await fs.writeFile(outputPath, rendered, 'utf8');
                    console.log(`Built ${contentType}/${category} page ${currentPage}/${totalPages}`);
                }
                
                // Build tag-filtered pages for this category
                await this.buildTagFilteredPages(contentType, category, categoryItems);
            }
        } catch (error) {
            console.error(`Error building ${contentType} paginated pages: ${error.message}`);
        }
    }

    async buildTagFilteredPages(contentType, category, categoryItems) {
        const tags = this.getUniqueTagsForCategory(categoryItems, category);
        
        for (const tag of tags) {
            const taggedItems = categoryItems.filter(item => item.tag === tag);
            
            if (taggedItems.length === 0) continue;
            
            const templateName = `${contentType}.html`;
            const rendered = this.env.render(templateName, {
                config: this.config,
                content_items: taggedItems,
                page_items: taggedItems,
                current_page_number: 1,
                total_pages: 1,
                has_next_page: false,
                has_prev_page: false,
                next_page_url: null,
                prev_page_url: null,
                current_category: category,
                available_categories: [category],
                available_tags: tags,
                current_tag: tag,
                current_page: contentType
            });
            
            // Create tag directory
            const tagDir = path.join(this.outputDir, contentType, category, 'tag', tag);
            await fs.mkdir(tagDir, { recursive: true });
            const outputPath = path.join(tagDir, 'index.html');
            
            await fs.writeFile(outputPath, rendered, 'utf8');
            console.log(`Built ${contentType}/${category}/tag/${tag}/index.html`);
        }
    }

    async buildIndex() {
        try {
            // Get all content from files
            const allWritings = await this.getContentMetadata('writings');
            const allProjects = await this.getContentMetadata('projects');
            
            // Use helper to select home page content
            const { homeWritings, homeProjects, hasProjects } = this.selectHomePageContent(allWritings, allProjects);

            const rendered = this.env.render('index.html', {
                config: this.config,
                home_writings: homeWritings,
                home_projects: homeProjects,
                has_projects: hasProjects,
                compact: true, // Pass compact flag for home page
                current_page: 'home'
            });

            const outputFile = path.join(this.outputDir, "index.html");
            await fs.writeFile(outputFile, rendered, 'utf8');

            console.log("Built index.html");
        } catch (error) {
            console.error(`Error building index: ${error.message}`);
        }
    }

    async buildProjectsPage() {
        try {
            // Get all project metadata
            const allProjects = await this.getContentMetadata('projects');

            const rendered = this.env.render('projects.html', {
                config: this.config,
                content_items: allProjects,
                current_page: 'projects'
            });

            const outputFile = path.join(this.outputDir, "projects.html");
            await fs.writeFile(outputFile, rendered, 'utf8');

            console.log("Built projects.html");
        } catch (error) {
            console.error(`Error building projects page: ${error.message}`);
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
            await this.buildContentPages('projects');

            // Build paginated list pages
            await this.buildPaginatedCategoryPages('writings');

            // Build index page
            await this.buildIndex();

            // Build projects page
            await this.buildProjectsPage();

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
    
    // Redirect root to writings page (before static middleware)
    app.get('/', (req, res) => {
        res.redirect('/writings.html');
    });
    
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