import { useState, useRef, useEffect, useCallback } from 'react';

// File content mapping based on bio.md and career data
const fileContents: Record<string, { content: string; language: string }> = {
  'applique/index.ts': {
    language: 'typescript',
    content: `// Applique Core - Content Authoring Engine
// Tech Lead: Diogo Reus | 2012-2017

import { Model, Collection } from 'backbone';
import * as AWS from 'aws-sdk';
import { SCORMExporter } from './scorm-export';

interface CourseData {
  title: string;
  scormVersion: '1.2' | '2004';
  interactions: Interaction[];
  assets: AssetReference[];
}

/**
 * CourseModule - Core content unit for e-learning courses
 * Features: Drag-and-drop, SCORM export, asset management
 */
export class CourseModule extends Model<CourseData> {
  private s3: AWS.S3;
  private exporter: SCORMExporter;

  defaults(): CourseData {
    return {
      title: 'Untitled Course',
      scormVersion: '1.2',
      interactions: [],
      assets: []
    };
  }

  constructor(attrs?: Partial<CourseData>) {
    super(attrs);
    this.s3 = new AWS.S3({ region: 'sa-east-1' });
    this.exporter = new SCORMExporter(this);
  }

  async exportToSCORM(): Promise<string> {
    const manifest = this.exporter.generateManifest();
    const packageUrl = await this.uploadPackage(manifest);

    console.log(\`[Applique] SCORM package ready: \${packageUrl}\`);
    return packageUrl;
  }

  private async uploadPackage(manifest: string): Promise<string> {
    const key = \`courses/\${this.id}/imsmanifest.xml\`;

    await this.s3.putObject({
      Bucket: 'applique-exports',
      Key: key,
      Body: manifest,
      ContentType: 'application/xml'
    }).promise();

    return \`https://cdn.applique.com.br/\${key}\`;
  }
}

// Stats: 100+ clients | 50+ internal users | 1M+ assets`,
  },

  'applique/package.json': {
    language: 'json',
    content: `{
  "name": "applique",
  "version": "2.0.0",
  "description": "Brazil's leading e-learning authoring platform",
  "main": "dist/index.js",
  "scripts": {
    "build": "gulp build",
    "test": "mocha --recursive",
    "deploy": "gulp deploy --env=production"
  },
  "dependencies": {
    "backbone": "^1.4.0",
    "underscore": "^1.9.1",
    "aws-sdk": "^2.814.0",
    "mongodb": "^3.6.0",
    "express": "^4.17.1",
    "socket.io": "^2.4.0"
  },
  "devDependencies": {
    "gulp": "^4.0.2",
    "sass": "^1.26.0",
    "mocha": "^8.2.0",
    "chai": "^4.2.0"
  },
  "engines": {
    "node": ">=12.0.0"
  },
  "author": "Mobiliza Team",
  "license": "PROPRIETARY"
}`,
  },

  'applique/src/course-module.ts': {
    language: 'typescript',
    content: `// Course Module - Advanced Content Management
import { Model, View } from 'backbone';
import { DragDropManager } from './drag-drop';
import { AssetLibrary } from './asset-library';

interface ModuleConfig {
  maxAssets: number;
  allowedFormats: string[];
  scormCompliance: 'strict' | 'relaxed';
}

export class CourseModuleView extends View<CourseModule> {
  private dragDrop: DragDropManager;
  private assetLib: AssetLibrary;

  events() {
    return {
      'click .add-slide': 'addSlide',
      'click .add-interaction': 'addInteraction',
      'dragover .drop-zone': 'handleDragOver',
      'drop .drop-zone': 'handleDrop',
    };
  }

  initialize(options: ModuleConfig) {
    this.dragDrop = new DragDropManager(this.el);
    this.assetLib = new AssetLibrary({
      limit: options.maxAssets,
      formats: options.allowedFormats
    });

    this.listenTo(this.model, 'change', this.render);
  }

  addSlide() {
    this.model.get('slides').push({
      type: 'content',
      elements: [],
      duration: 0
    });
    this.trigger('slide:added');
  }

  addInteraction() {
    // Quiz, drag-drop, hotspot, etc.
    const interactionType = this.promptInteractionType();
    this.model.addInteraction(interactionType);
  }

  render() {
    // Render slide thumbnails, timeline, properties panel
    return this;
  }
}`,
  },

  'applique/src/scorm-export.ts': {
    language: 'typescript',
    content: `// SCORM Export Module - 1.2 & 2004 Support
import { create as xmlCreate } from 'xmlbuilder2';
import * as JSZip from 'jszip';

type SCORMVersion = '1.2' | '2004';

interface ManifestOptions {
  version: SCORMVersion;
  courseTitle: string;
  identifier: string;
  organization: string;
}

export class SCORMExporter {
  private course: CourseModule;

  constructor(course: CourseModule) {
    this.course = course;
  }

  generateManifest(): string {
    const version = this.course.get('scormVersion');

    if (version === '2004') {
      return this.generateSCORM2004Manifest();
    }
    return this.generateSCORM12Manifest();
  }

  private generateSCORM12Manifest(): string {
    const manifest = xmlCreate({ version: '1.0' })
      .ele('manifest', {
        identifier: this.course.id,
        version: '1.0',
        xmlns: 'http://www.imsproject.org/xsd/imscp_rootv1p1p2'
      })
      .ele('organizations', { default: 'org1' })
        .ele('organization', { identifier: 'org1' })
          .ele('title').txt(this.course.get('title')).up()
          .ele('item', { identifier: 'item1', identifierref: 'res1' })
            .ele('title').txt('Launch Course').up()
          .up()
        .up()
      .up()
      .ele('resources')
        .ele('resource', {
          identifier: 'res1',
          type: 'webcontent',
          'adlcp:scormtype': 'sco',
          href: 'index.html'
        })
      .up();

    return manifest.end({ prettyPrint: true });
  }

  async createPackage(): Promise<Blob> {
    const zip = new JSZip();
    const manifest = this.generateManifest();

    zip.file('imsmanifest.xml', manifest);
    zip.file('index.html', this.generateLauncher());
    // Add course assets...

    return zip.generateAsync({ type: 'blob' });
  }
}`,
  },

  'applique/src/asset-library.ts': {
    language: 'typescript',
    content: `// Asset Library - 1M+ Images, Icons & Animations
import { EventEmitter } from 'events';
import { S3 } from 'aws-sdk';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'icon' | 'animation' | 'video';
  url: string;
  thumbnail: string;
  tags: string[];
  metadata: AssetMetadata;
}

interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  fileSize: number;
  format: string;
}

export class AssetLibrary extends EventEmitter {
  private s3: S3;
  private cache: Map<string, Asset>;
  private searchIndex: SearchIndex;

  constructor() {
    super();
    this.s3 = new S3({ region: 'sa-east-1' });
    this.cache = new Map();
    this.searchIndex = new SearchIndex();
  }

  async search(query: string, filters?: AssetFilters): Promise<Asset[]> {
    const results = await this.searchIndex.query(query, {
      type: filters?.type,
      tags: filters?.tags,
      limit: filters?.limit || 50
    });

    return results.map(r => this.enrichAsset(r));
  }

  async upload(file: File, metadata: Partial<Asset>): Promise<Asset> {
    const key = \`assets/\${Date.now()}-\${file.name}\`;

    await this.s3.putObject({
      Bucket: 'applique-assets',
      Key: key,
      Body: file,
      ContentType: file.type
    }).promise();

    const asset: Asset = {
      id: key,
      name: metadata.name || file.name,
      type: this.detectType(file),
      url: \`https://cdn.applique.com.br/\${key}\`,
      thumbnail: await this.generateThumbnail(file),
      tags: metadata.tags || [],
      metadata: {
        fileSize: file.size,
        format: file.type
      }
    };

    this.emit('asset:uploaded', asset);
    return asset;
  }

  // Library stats: 1,000,000+ assets available
}`,
  },

  'applique/config/aws.json': {
    language: 'json',
    content: `{
  "region": "sa-east-1",
  "services": {
    "s3": {
      "buckets": {
        "assets": "applique-assets",
        "exports": "applique-exports",
        "backups": "applique-backups"
      }
    },
    "ec2": {
      "instanceType": "t2.medium",
      "autoScaling": {
        "min": 2,
        "max": 8,
        "targetCPU": 70
      }
    },
    "sqs": {
      "queues": {
        "export": "applique-export-queue",
        "notification": "applique-notifications"
      }
    },
    "cloudfront": {
      "distribution": "E1EXAMPLE123"
    }
  },
  "devops": {
    "tool": "Chef",
    "cookbooks": ["applique-app", "applique-db", "applique-nginx"]
  }
}`,
  },

  'applique/config/database.json': {
    language: 'json',
    content: `{
  "mongodb": {
    "hosts": [
      "mongo-primary.applique.internal:27017",
      "mongo-secondary.applique.internal:27017"
    ],
    "replicaSet": "applique-rs0",
    "database": "applique_production",
    "options": {
      "useNewUrlParser": true,
      "useUnifiedTopology": true,
      "retryWrites": true,
      "w": "majority"
    }
  },
  "collections": {
    "courses": {
      "indexes": ["userId", "createdAt", "status"]
    },
    "assets": {
      "indexes": ["type", "tags", "uploadedBy"]
    },
    "users": {
      "indexes": ["email", "organizationId"]
    },
    "exports": {
      "indexes": ["courseId", "status", "createdAt"]
    }
  },
  "backup": {
    "schedule": "0 2 * * *",
    "retention": "30d",
    "destination": "s3://applique-backups/"
  }
}`,
  },

  'roles/tech-lead.md': {
    language: 'markdown',
    content: `# Tech Lead (Mar 2012 - Dec 2013)

## Duration
1 year 10 months @ Mobiliza

## Overview
Worked as a full stack developer on Applique, the leading
Brazilian content authoring platform for the T&D market,
managing both technical development and project leadership.

## Key Achievements

### Architecture & Infrastructure
- Led critical decisions in architecture, infrastructure,
  and technology stack selection
- Set up and maintained AWS services (EC2, S3, SQS)
- Managed DevOps infrastructure with Chef

### Frontend Development
- Developed the front-end using Backbone.js
- Created functional and scalable interfaces
- Implemented Sass and Gulp build pipeline

### Backend Development
- Contributed to Node.js backend development
- Ensured MongoDB integration and system stability
- Built RESTful APIs for course management

### Team Leadership
- Supervised and coordinated team of 4 developers
- Ensured timely delivery aligned with company needs
- Established code review practices

## Tech Stack
\`\`\`
Frontend: Backbone.js, Sass, Gulp
Backend:  Node.js, MongoDB, Express
Cloud:    AWS (EC2, S3, SQS)
DevOps:   Chef
\`\`\`

## Projects
- Infográfico Animado - MAN (VW product line)
- Tutorial Applique | Edição de imagem`,
  },

  'roles/head-of-product.md': {
    language: 'markdown',
    content: `# Head of Product (Dec 2013 - Jul 2017)

## Duration
3 years 8 months @ Mobiliza

## Overview
Led product and technology strategy for Applique,
establishing it as the primary solution for the T&D
market and expanding reach across clients and teams.

## Key Achievements

### Business Growth
- Secured 100+ contracting clients
- Platform adopted by team of 50 professionals
  (Instructional Designers, Content Specialists, PMs)

### Team Management
- Managed team of up to 10 professionals
- Product Designers and Developers
- Coordinated with Sales, CS, and Support teams

### Infrastructure
- Oversaw platform infrastructure on AWS
- Implemented DevOps practices using Chef
- Ensured scalability and system stability

### Product Strategy
- Collaborated with commercial teams
- Aligned product evolution with market demands
- Drove efficient product delivery

## Methodologies
- Scrum
- Kanban

## Key Metrics
\`\`\`
Clients:        100+
Internal Users: 50+
Team Size:      10
Assets:         1M+
\`\`\`

## Project
Applique - Ferramenta de autoria
(HTML training construction tool)`,
  },

  '.env': {
    language: 'env',
    content: `# ══════════════════════════════════════════════════════════
#  🚨 CAUGHT RED-HANDED! 🚨
# ══════════════════════════════════════════════════════════
#
#  Nice try! Looking for my API keys, huh?
#
#  You thought you'd find something like this:
#
#  AWS_ACCESS_KEY_ID=AKIA...nice_try
#  AWS_SECRET_ACCESS_KEY=hunter2
#  OPENAI_API_KEY=sk-you-wish
#  STRIPE_SECRET_KEY=sk_live_gotcha
#
#  But instead, you found this message.
#
#  I've been in this industry for 15+ years.
#  I know better than to commit secrets to a portfolio site. 😎
#
# ══════════════════════════════════════════════════════════
#  While you're here, some ACTUAL facts:
# ══════════════════════════════════════════════════════════
#
#  YEARS_IN_EDTECH=15+
#  REVENUE_SCALED="$0 → $10M ARR"
#  LEARNERS_TRAINED=200000+
#  AI_LESSONS_GENERATED=595
#  CUPS_OF_COFFEE=∞
#
#  Want to work together? Try: hire diogo
#
# ══════════════════════════════════════════════════════════`,
  },
};

// File tree structure
interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  icon?: string;
  open?: boolean;
}

const initialFileTree: FileNode[] = [
  {
    name: 'applique',
    type: 'folder',
    path: 'applique',
    open: true,
    children: [
      { name: 'package.json', type: 'file', path: 'applique/package.json', icon: 'package' },
      { name: 'index.ts', type: 'file', path: 'applique/index.ts', icon: 'typescript' },
      {
        name: 'src',
        type: 'folder',
        path: 'applique/src',
        open: true,
        children: [
          { name: 'course-module.ts', type: 'file', path: 'applique/src/course-module.ts', icon: 'typescript' },
          { name: 'scorm-export.ts', type: 'file', path: 'applique/src/scorm-export.ts', icon: 'typescript' },
          { name: 'asset-library.ts', type: 'file', path: 'applique/src/asset-library.ts', icon: 'typescript' },
        ],
      },
      {
        name: 'config',
        type: 'folder',
        path: 'applique/config',
        open: false,
        children: [
          { name: 'aws.json', type: 'file', path: 'applique/config/aws.json', icon: 'settings' },
          { name: 'database.json', type: 'file', path: 'applique/config/database.json', icon: 'settings' },
        ],
      },
    ],
  },
  {
    name: 'roles',
    type: 'folder',
    path: 'roles',
    open: true,
    children: [
      { name: 'tech-lead.md', type: 'file', path: 'roles/tech-lead.md', icon: 'markdown' },
      { name: 'head-of-product.md', type: 'file', path: 'roles/head-of-product.md', icon: 'markdown' },
    ],
  },
  { name: '.env', type: 'file', path: '.env', icon: 'env' },
];

// Terminal easter eggs and commands
const terminalCommands: Record<string, string> = {
  help: `Available commands:
  help          - Show this message
  clear         - Clear terminal
  ls            - List files
  git log       - Show commit history
  npm run build - Build the project
  coffee        - Get some coffee ☕
  hire diogo    - 🎉
  whoami        - Who am I?
  sudo rm -rf / - ⚠️  DO NOT RUN THIS`,

  'git log': `commit 2f8a3b1 (HEAD -> main)
Author: Diogo Reus <diogo@mobiliza.com.br>
Date:   Thu Dec 15 2016 14:32:00 -0300

    feat: add SCORM 2004 export support

commit b4c7d2e
Author: Diogo Reus <diogo@mobiliza.com.br>
Date:   Wed Dec 14 2016 10:15:00 -0300

    refactor: migrate UI to Backbone.js views

commit 9e1f5a8
Author: Diogo Reus <diogo@mobiliza.com.br>
Date:   Mon Dec 12 2016 09:00:00 -0300

    chore: setup AWS S3 integration

commit 3a2b9c4
Author: Diogo Reus <diogo@mobiliza.com.br>
Date:   Fri Dec 9 2016 16:45:00 -0300

    feat: implement drag-and-drop editor`,

  ls: `applique/    roles/    .env`,

  'npm run build': `> applique@2.0.0 build
> gulp build

[14:32:15] Using gulpfile ~/applique/gulpfile.js
[14:32:15] Starting 'build'...
[14:32:15] Starting 'clean'...
[14:32:15] Finished 'clean' after 45 ms
[14:32:15] Starting 'compile:ts'...
[14:32:17] Finished 'compile:ts' after 2.1 s
[14:32:17] Starting 'compile:sass'...
[14:32:18] Finished 'compile:sass' after 890 ms
[14:32:18] Starting 'bundle'...
[14:32:20] Finished 'bundle' after 1.8 s
[14:32:20] Finished 'build' after 4.84 s

✓ Build complete! Output: dist/`,

  coffee: `
        ( (
         ) )
      ._______.
      |       |]
      \\       /
       \`-----'

  Here's your coffee! ☕

  Fun fact: This codebase was fueled by
  approximately 2,847 cups of coffee.`,

  'hire diogo': `
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🎉 EXCELLENT CHOICE! 🎉                         ║
  ║                                                   ║
  ║   Diogo brings:                                   ║
  ║   ✓ 15+ years EdTech experience                   ║
  ║   ✓ Designer + Developer + Executive              ║
  ║   ✓ $0 → $10M ARR transformation                  ║
  ║   ✓ AI curriculum: 595 lessons in 6 months        ║
  ║                                                   ║
  ║   Let's build something amazing together!         ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝`,

  whoami: `diogo@mobiliza (Tech Lead → Head of Product → CPO → CGO)

Current role: Senior AI Technical PM @ AE Studio
Mission: Increase human agency through AI`,

  'sudo rm -rf /': '__SHUTDOWN_EFFECT__',
  'sudo rm -rf /*': '__SHUTDOWN_EFFECT__',
  'sudo rm -rf / --no-preserve-root': '__SHUTDOWN_EFFECT__',

  pwd: `/home/diogo/projects/applique`,

  date: new Date().toString(),

  echo: 'Usage: echo <message>',

  cat: 'Usage: cat <filename>',

  'npm test': `> applique@2.0.0 test
> mocha --recursive

  CourseModule
    ✓ should create with default values
    ✓ should export to SCORM 1.2
    ✓ should export to SCORM 2004
    ✓ should upload to S3

  AssetLibrary
    ✓ should search assets by query
    ✓ should filter by type
    ✓ should upload new assets

  7 passing (234ms)`,
};

// Simple syntax highlighting
function highlightCode(code: string, language: string): string {
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'export', 'import', 'from', 'async', 'await', 'new', 'this', 'try', 'catch', 'interface', 'type', 'extends', 'implements', 'private', 'public', 'protected', 'readonly', 'static', 'get', 'set', 'super', 'default', 'throw', 'typeof', 'instanceof'];
  const builtins = ['console', 'require', 'module', 'process', 'document', 'window', 'Promise', 'Map', 'Set', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON', 'Error'];

  if (language === 'json') {
    return code
      .replace(/"([^"]+)":/g, '<span class="property">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="string">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="number">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="keyword">$1</span>');
  }

  if (language === 'markdown') {
    return code
      .replace(/^(#{1,6})\s+(.+)$/gm, '<span class="keyword">$1</span> <span class="function">$2</span>')
      .replace(/^(\s*[-*])\s+(.+)$/gm, '<span class="comment">$1</span> $2')
      .replace(/`([^`]+)`/g, '<span class="string">`$1`</span>')
      .replace(/```[\s\S]*?```/g, (match) => `<span class="comment">${match}</span>`);
  }

  let highlighted = code
    .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="string">$&</span>')
    .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

  keywords.forEach((kw) => {
    highlighted = highlighted.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="keyword">$1</span>');
  });

  builtins.forEach((bi) => {
    highlighted = highlighted.replace(new RegExp(`\\b(${bi})\\b`, 'g'), '<span class="builtin">$1</span>');
  });

  highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="function">$1</span>(');

  return highlighted;
}

// File icon component
function FileIcon({ icon, className = '' }: { icon?: string; className?: string }) {
  const baseClass = `file-icon ${className}`;

  switch (icon) {
    case 'typescript':
      return (
        <svg className={`${baseClass} icon-typescript`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25V1.75ZM9.3 8.4v.65c.37-.17.79-.26 1.25-.26.5 0 .89.13 1.19.38.3.26.45.62.45 1.08v2.55h-.98V10.4c0-.27-.07-.47-.21-.6-.14-.14-.35-.21-.63-.21-.23 0-.45.05-.66.15v3.06h-.98V8.4h.57Zm-5.5.3v3.9h1.1v-2.93h1.77v-.97H3.8Z" />
        </svg>
      );
    case 'package':
      return (
        <svg className={`${baseClass} icon-package`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.878.392a1.75 1.75 0 0 0-1.756 0l-5.25 3.045A1.75 1.75 0 0 0 1 4.951v6.098c0 .624.332 1.2.872 1.514l5.25 3.045a1.75 1.75 0 0 0 1.756 0l5.25-3.045c.54-.313.872-.89.872-1.514V4.951c0-.624-.332-1.2-.872-1.514L8.878.392ZM7.875 1.69a.25.25 0 0 1 .25 0l4.63 2.685L8 7.133 3.245 4.375l4.63-2.685ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432L2.5 5.677Zm6.25 8.271 4.625-2.683a.25.25 0 0 0 .125-.216V5.677L8.75 8.432v5.516Z" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={`${baseClass} icon-settings`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
        </svg>
      );
    case 'markdown':
      return (
        <svg className={`${baseClass} icon-markdown`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M14.85 3c.63 0 1.15.52 1.14 1.15v7.7c0 .63-.51 1.15-1.15 1.15H1.15C.52 13 0 12.48 0 11.84V4.15C0 3.52.52 3 1.15 3ZM9 11V5H7l-2 2-2-2H2v6h1.5V7.5l1.5 1.5 1.5-1.5V11Zm2.99-1.5L14 7h-1.5v-2h-2v2H9l2.49 2.5Z" />
        </svg>
      );
    case 'env':
      return (
        <svg className={`${baseClass} icon-env`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11ZM0 2.5A2.5 2.5 0 0 1 2.5 0h11A2.5 2.5 0 0 1 16 2.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 13.5v-11Z"/>
          <path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 0 1H6.5v1.5h3a.5.5 0 0 1 0 1h-3V10H10a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5v-5Z"/>
        </svg>
      );
    case 'hidden':
      return (
        <svg className={`${baseClass} icon-hidden`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.831.88 9.577.43 8.9a1.618 1.618 0 0 1 0-1.798c.45-.678 1.367-1.932 2.637-3.023C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
        </svg>
      );
    case 'folder':
      return (
        <svg className={`${baseClass} icon-folder`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z" />
        </svg>
      );
    case 'folder-open':
      return (
        <svg className={`${baseClass} icon-folder-open`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1h6.5A1.75 1.75 0 0 1 16 4.75v8.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25v-10c0-.465.185-.91.513-1.237ZM1.75 2.5a.25.25 0 0 0-.25.25V5h4.5a.75.75 0 0 1 0 1.5H1.5v6.75c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V4.75a.25.25 0 0 0-.25-.25H7.75c-.55 0-1.07-.26-1.4-.7l-.9-1.2a.25.25 0 0 0-.2-.1H1.75Z" />
        </svg>
      );
    default:
      return (
        <svg className={`${baseClass} icon-file`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.75 1.5a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5H3.75Zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06ZM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25V1.75Z" />
        </svg>
      );
  }
}

// Chevron icon for folders
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`chevron ${expanded ? 'expanded' : ''}`}
      width="10"
      height="10"
      viewBox="0 0 10 10"
    >
      <path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// File tree item component
function FileTreeItem({
  node,
  activeFile,
  onFileClick,
  onFolderToggle,
  depth = 0,
}: {
  node: FileNode;
  activeFile: string;
  onFileClick: (path: string) => void;
  onFolderToggle: (path: string) => void;
  depth?: number;
}) {
  const isActive = activeFile === node.path;
  const paddingLeft = depth * 12 + 8;

  if (node.type === 'folder') {
    return (
      <div className="tree-folder">
        <button
          className={`folder-header ${node.open ? 'expanded' : ''}`}
          onClick={() => onFolderToggle(node.path)}
          style={{ paddingLeft }}
        >
          <ChevronIcon expanded={node.open || false} />
          <FileIcon icon={node.open ? 'folder-open' : 'folder'} />
          <span className="folder-name">{node.name}</span>
        </button>
        {node.open && node.children && (
          <div className="folder-content">
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                activeFile={activeFile}
                onFileClick={onFileClick}
                onFolderToggle={onFolderToggle}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={`tree-file ${isActive ? 'active' : ''}`}
      onClick={() => onFileClick(node.path)}
      style={{ paddingLeft: paddingLeft + 14 }}
    >
      <FileIcon icon={node.icon} />
      <span className="file-name">{node.name}</span>
    </button>
  );
}

// Tab component
function Tab({
  path,
  isActive,
  onSelect,
  onClose,
}: {
  path: string;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
}) {
  const filename = path.split('/').pop() || path;
  const icon = path.endsWith('.ts') ? 'typescript' : path.endsWith('.json') ? 'package' : path.endsWith('.md') ? 'markdown' : 'file';

  return (
    <button className={`tab ${isActive ? 'active' : ''}`} onClick={onSelect}>
      <FileIcon icon={icon} className="tab-icon" />
      <span className="tab-name">{filename}</span>
      <span
        className="tab-close"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClose(e as unknown as React.MouseEvent)}
      >
        ×
      </span>
    </button>
  );
}

// Code editor component
function CodeEditor({ content, language }: { content: string; language: string }) {
  const lines = content.split('\n');

  return (
    <div className="code-editor">
      <div className="line-numbers">
        {lines.map((_, i) => (
          <span key={i} className="line-num">
            {i + 1}
          </span>
        ))}
      </div>
      <div className="code-content">
        <pre>
          <code dangerouslySetInnerHTML={{ __html: highlightCode(content, language) }} />
        </pre>
      </div>
    </div>
  );
}

// Interactive terminal component
function InteractiveTerminal({ onShutdown }: { onShutdown?: () => void }) {
  const [history, setHistory] = useState<Array<{ type: 'input' | 'output'; content: string }>>([
    { type: 'output', content: 'Welcome to Applique Terminal' },
    { type: 'output', content: "Type 'help' for available commands.\n" },
  ]);
  const [input, setInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintText = 'sudo rm -rf /';

  const processCommand = useCallback((cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    const newHistory = [...history, { type: 'input' as const, content: `$ ${cmd}` }];

    if (trimmedCmd === 'clear') {
      setHistory([]);
      return;
    }

    let output = terminalCommands[trimmedCmd];

    // Check for shutdown effect trigger
    if (output === '__SHUTDOWN_EFFECT__') {
      setHistory([...newHistory, { type: 'output', content: 'Deleting system files...' }]);
      setInput('');
      // Trigger the shutdown effect after a brief delay
      setTimeout(() => {
        onShutdown?.();
      }, 500);
      return;
    }

    if (!output) {
      if (trimmedCmd.startsWith('echo ')) {
        output = trimmedCmd.slice(5);
      } else if (trimmedCmd.startsWith('cat ')) {
        const file = trimmedCmd.slice(4);
        const content = fileContents[file];
        if (content) {
          output = content.content;
        } else {
          output = `cat: ${file}: No such file or directory`;
        }
      } else if (trimmedCmd) {
        output = `Command not found: ${trimmedCmd}\nType 'help' for available commands.`;
      }
    }

    if (output) {
      newHistory.push({ type: 'output', content: output });
    }

    setHistory(newHistory);
    setInput('');
  }, [history, onShutdown]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      processCommand(input);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (input === '' || hintText.toLowerCase().startsWith(input.toLowerCase())) {
        setInput(hintText);
      }
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="terminal-body" ref={terminalRef} onClick={focusInput}>
      {history.map((item, i) => (
        <div key={i} className={`terminal-line ${item.type}`}>
          <pre>{item.content}</pre>
        </div>
      ))}
      <div className="terminal-input-line">
        <span className="terminal-prompt">$</span>
        <div className="terminal-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowHint(true)}
            onBlur={() => setShowHint(false)}
            className="terminal-input"
            autoComplete="off"
            spellCheck={false}
          />
          {showHint && input === '' && (
            <span className="terminal-hint">{hintText}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Problems panel content
function ProblemsPanel() {
  return (
    <div className="panel-body problems-panel">
      <div className="no-problems">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
        </svg>
        <span>No problems in workspace</span>
      </div>
      <div className="problems-hint">
        <span className="hint-text">Pro tip: The best code has zero warnings.</span>
        <span className="hint-text">Just like this codebase. ✨</span>
      </div>
    </div>
  );
}

// Output panel content
function OutputPanel() {
  return (
    <div className="panel-body output-panel">
      <pre className="output-content">{`[14:32:20] Starting compilation...
[14:32:21] Found 0 errors. Watching for file changes.

╭─────────────────────────────────────────────────╮
│                                                 │
│   🚀 Applique v2.0.0 - Build successful!        │
│                                                 │
│   Stats:                                        │
│   ├─ 100+ clients served                        │
│   ├─ 50+ internal users                         │
│   ├─ 1,000,000+ assets in library               │
│   └─ 0 bugs (okay, maybe a few)                 │
│                                                 │
│   "Products are made for people by people"      │
│                                                 │
╰─────────────────────────────────────────────────╯

[14:32:20] Compilation complete.`}</pre>
    </div>
  );
}

// Main IDE component
export default function IDEComponent() {
  const [activeFile, setActiveFile] = useState('applique/index.ts');
  const [openTabs, setOpenTabs] = useState(['applique/index.ts']);
  const [activePanel, setActivePanel] = useState<'terminal' | 'problems' | 'output'>('terminal');
  const [fileTree, setFileTree] = useState<FileNode[]>(initialFileTree);
  const [showPanel, setShowPanel] = useState(true);
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  const handleShutdown = useCallback(() => {
    setIsShuttingDown(true);
    // Dispatch global event for site-wide overlay
    window.dispatchEvent(new CustomEvent('ideShutdown', { detail: { duration: 3000 } }));
    // Reset after 3 seconds
    setTimeout(() => {
      setIsShuttingDown(false);
    }, 3000);
  }, []);

  const openFile = useCallback((path: string) => {
    setActiveFile(path);
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path]);
    }
  }, [openTabs]);

  const closeTab = useCallback((e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== path);
    setOpenTabs(newTabs);
    if (activeFile === path && newTabs.length > 0) {
      setActiveFile(newTabs[newTabs.length - 1]);
    }
  }, [openTabs, activeFile]);

  const toggleFolder = useCallback((path: string) => {
    const toggleNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === path) {
          return { ...node, open: !node.open };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setFileTree(toggleNode(fileTree));
  }, [fileTree]);

  const currentFile = fileContents[activeFile] || { content: '// File not found', language: 'text' };
  const filename = activeFile.split('/').pop() || activeFile;

  return (
    <div className={`ide-component ${isShuttingDown ? 'shutting-down' : ''}`}>
      {/* Title bar */}
      <div className="ide-titlebar">
        <div className="traffic-lights">
          <span className="light light-close"></span>
          <span className="light light-minimize"></span>
          <span className="light light-maximize"></span>
        </div>
        <div className="titlebar-center">
          <span className="title-text">{filename} - Visual Studio Code</span>
        </div>
        <div className="titlebar-actions">
          <button className="action-btn" aria-label="Toggle panel" onClick={() => setShowPanel(!showPanel)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="0" width="14" height="8" />
              <rect x="0" y="9" width="14" height="5" opacity={showPanel ? '1' : '0.3'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ide-tabs">
        {openTabs.map((path) => (
          <Tab
            key={path}
            path={path}
            isActive={path === activeFile}
            onSelect={() => setActiveFile(path)}
            onClose={(e) => closeTab(e, path)}
          />
        ))}
        <div className="tabs-spacer"></div>
      </div>

      {/* Breadcrumb */}
      <div className="ide-breadcrumb">
        {activeFile.split('/').map((part, i, arr) => (
          <span key={i}>
            <span className={`breadcrumb-item ${i === arr.length - 1 ? 'active' : ''}`}>{part}</span>
            {i < arr.length - 1 && <span className="breadcrumb-sep">&gt;</span>}
          </span>
        ))}
      </div>

      {/* Main content */}
      <div className="ide-layout">
        {/* File explorer sidebar */}
        <aside className="file-explorer">
          <div className="explorer-header">
            <span className="header-title">EXPLORER</span>
          </div>
          <div className="explorer-tree">
            <div className="tree-section">
              <button className="section-header expanded">
                <ChevronIcon expanded />
                <span className="section-name">CAREER</span>
              </button>
              <div className="section-content">
                {fileTree.map((node) => (
                  <FileTreeItem
                    key={node.path}
                    node={node}
                    activeFile={activeFile}
                    onFileClick={openFile}
                    onFolderToggle={toggleFolder}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Editor area */}
        <div className="editor-area">
          <CodeEditor content={currentFile.content} language={currentFile.language} />

          {/* Bottom panels */}
          {showPanel && (
            <div className="terminal-panel">
              <div className="panel-tabs">
                <button
                  className={`panel-tab ${activePanel === 'terminal' ? 'active' : ''}`}
                  onClick={() => setActivePanel('terminal')}
                >
                  TERMINAL
                </button>
                <button
                  className={`panel-tab ${activePanel === 'problems' ? 'active' : ''}`}
                  onClick={() => setActivePanel('problems')}
                >
                  PROBLEMS
                </button>
                <button
                  className={`panel-tab ${activePanel === 'output' ? 'active' : ''}`}
                  onClick={() => setActivePanel('output')}
                >
                  OUTPUT
                </button>
                <div className="panel-spacer"></div>
                <button className="panel-action" onClick={() => setShowPanel(false)}>
                  ×
                </button>
              </div>
              {activePanel === 'terminal' && <InteractiveTerminal onShutdown={handleShutdown} />}
              {activePanel === 'problems' && <ProblemsPanel />}
              {activePanel === 'output' && <OutputPanel />}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="ide-statusbar">
        <div className="status-left">
          <span className="status-item status-branch">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="3" cy="3" r="2" />
              <circle cx="9" cy="9" r="2" />
              <line x1="3" y1="5" x2="3" y2="7" stroke="currentColor" strokeWidth="1.5" />
              <line x1="3" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            main
          </span>
          <span className="status-item">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" />
              <path d="M6 3v4" stroke="currentColor" />
              <circle cx="6" cy="9" r="1" />
            </svg>
            0
          </span>
          <span className="status-item">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1L1 11h10L6 1z" fill="none" stroke="currentColor" />
              <path d="M6 4v3" stroke="currentColor" />
              <circle cx="6" cy="9" r="1" />
            </svg>
            0
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">{currentFile.language === 'typescript' ? 'TypeScript' : currentFile.language === 'json' ? 'JSON' : currentFile.language === 'markdown' ? 'Markdown' : 'Plain Text'}</span>
          <span className="status-item">UTF-8</span>
          <span className="status-item">LF</span>
        </div>
      </div>

      <style>{`
        .ide-component {
          background: #1e1e1e;
          border-radius: 8px;
          overflow: hidden;
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          height: 550px;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Title bar */
        .ide-titlebar {
          display: flex;
          align-items: center;
          height: 38px;
          padding: 0 12px;
          background: #323233;
          border-bottom: 1px solid #252526;
          user-select: none;
          flex-shrink: 0;
        }

        .traffic-lights {
          display: flex;
          gap: 8px;
          margin-right: 16px;
        }

        .light {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          cursor: pointer;
          transition: filter 0.15s ease;
        }

        .light-close { background: #ff5f57; }
        .light-minimize { background: #febc2e; }
        .light-maximize { background: #28c840; }
        .light:hover { filter: brightness(1.1); }

        .titlebar-center {
          flex: 1;
          text-align: center;
        }

        .title-text {
          font-size: 0.75rem;
          color: #8b8b8b;
        }

        .titlebar-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #8b8b8b;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.15s ease;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #c5c5c5;
        }

        /* Tab bar */
        .ide-tabs {
          display: flex;
          background: #252526;
          border-bottom: 1px solid #1e1e1e;
          overflow-x: auto;
          flex-shrink: 0;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #2d2d2d;
          border: none;
          border-right: 1px solid #252526;
          color: #8b8b8b;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .tab:hover { background: #323233; }

        .tab.active {
          background: #1e1e1e;
          color: #ffffff;
          border-bottom: 1px solid #1e1e1e;
          margin-bottom: -1px;
        }

        .tab-icon {
          width: 14px;
          height: 14px;
        }

        .tab-close {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.15s ease;
          font-size: 14px;
        }

        .tab:hover .tab-close { opacity: 1; }
        .tab-close:hover { background: rgba(255, 255, 255, 0.1); }

        .tabs-spacer {
          flex: 1;
          background: #252526;
        }

        /* Breadcrumb */
        .ide-breadcrumb {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 16px;
          background: #1e1e1e;
          border-bottom: 1px solid #252526;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .breadcrumb-item { color: #8b8b8b; }
        .breadcrumb-item.active { color: #c5c5c5; }
        .breadcrumb-sep { color: #5a5a5a; margin: 0 2px; }

        /* Main layout */
        .ide-layout {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        /* File explorer */
        .file-explorer {
          width: 220px;
          background: #252526;
          border-right: 1px solid #1e1e1e;
          display: flex;
          flex-direction: column;
          font-size: 0.8rem;
          color: #cccccc;
          user-select: none;
          flex-shrink: 0;
        }

        .explorer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid #1e1e1e;
        }

        .header-title {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #bbbbbb;
        }

        .explorer-tree {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .tree-section { padding-bottom: 8px; }

        .section-header {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
          padding: 6px 8px;
          background: transparent;
          border: none;
          color: #bbbbbb;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
        }

        .section-header:hover { background: rgba(255, 255, 255, 0.05); }

        .section-content { padding-left: 8px; }

        .chevron {
          transition: transform 0.15s ease;
          color: #8b8b8b;
        }

        .chevron.expanded { transform: rotate(90deg); }

        .section-name { margin-left: 4px; }

        /* Folders */
        .tree-folder { margin-bottom: 2px; }

        .folder-header {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: #cccccc;
          font-size: 0.8rem;
          cursor: pointer;
          text-align: left;
          border-radius: 4px;
          transition: background 0.15s ease;
        }

        .folder-header:hover { background: rgba(255, 255, 255, 0.05); }
        .folder-header .chevron { color: #8b8b8b; }
        .folder-header.expanded .chevron { transform: rotate(90deg); }

        .folder-content {
          animation: folder-open 0.15s ease;
        }

        @keyframes folder-open {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Files */
        .tree-file {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: #cccccc;
          font-size: 0.8rem;
          cursor: pointer;
          text-align: left;
          border-radius: 4px;
          transition: background 0.15s ease;
          position: relative;
        }

        .tree-file:hover { background: rgba(255, 255, 255, 0.05); }

        .tree-file.active {
          background: #37373d;
        }

        .tree-file.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #0078d4;
        }

        .file-icon {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        .icon-typescript { color: #3178c6; }
        .icon-package { color: #cb3837; }
        .icon-settings { color: #8b949e; }
        .icon-markdown { color: #3fb950; }
        .icon-hidden { color: #ffa657; }
        .icon-env { color: #f1e05a; }
        .icon-folder, .icon-folder-open { color: #dcad5b; }
        .icon-file { color: #8b949e; }

        .file-name, .folder-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Editor area */
        .editor-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .code-editor {
          flex: 1;
          display: flex;
          background: #1e1e1e;
          overflow: auto;
          position: relative;
        }

        .line-numbers {
          display: flex;
          flex-direction: column;
          padding: 16px 0;
          padding-left: 16px;
          padding-right: 16px;
          background: #1e1e1e;
          border-right: 1px solid #252526;
          font-size: 0.8rem;
          color: #5a5a5a;
          text-align: right;
          user-select: none;
          position: sticky;
          left: 0;
          z-index: 1;
        }

        .line-num { line-height: 1.6; }

        .code-content {
          flex: 1;
          padding: 16px;
          overflow-x: auto;
        }

        .code-content pre {
          margin: 0;
          line-height: 1.6;
          font-size: 0.8rem;
        }

        .code-content code {
          color: #c9d1d9;
          white-space: pre;
        }

        /* Syntax highlighting */
        .code-content .keyword { color: #ff7b72; }
        .code-content .string { color: #a5d6ff; }
        .code-content .comment { color: #8b949e; font-style: italic; }
        .code-content .number { color: #79c0ff; }
        .code-content .function { color: #d2a8ff; }
        .code-content .builtin { color: #ffa657; }
        .code-content .property { color: #79c0ff; }

        /* Terminal panel */
        .terminal-panel {
          height: 180px;
          border-top: 1px solid #252526;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .panel-tabs {
          display: flex;
          align-items: center;
          background: #252526;
          border-bottom: 1px solid #1e1e1e;
          padding: 0 8px;
        }

        .panel-tab {
          padding: 6px 12px;
          background: transparent;
          border: none;
          color: #8b8b8b;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          cursor: pointer;
          transition: all 0.15s ease;
          border-bottom: 2px solid transparent;
        }

        .panel-tab:hover { color: #c5c5c5; }

        .panel-tab.active {
          color: #ffffff;
          border-bottom-color: #58a6ff;
        }

        .panel-spacer { flex: 1; }

        .panel-action {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #8b8b8b;
          cursor: pointer;
          font-size: 1rem;
          border-radius: 4px;
        }

        .panel-action:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        /* Terminal body */
        .terminal-body {
          flex: 1;
          padding: 8px 12px;
          background: #1e1e1e;
          overflow-y: auto;
          font-size: 0.8rem;
          cursor: text;
        }

        .terminal-line {
          margin-bottom: 2px;
        }

        .terminal-line pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .terminal-line.input pre {
          color: #c9d1d9;
        }

        .terminal-line.output pre {
          color: #8b949e;
        }

        .terminal-input-line {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .terminal-prompt {
          color: #3fb950;
        }

        .terminal-input-wrapper {
          position: relative;
          flex: 1;
        }

        .terminal-input {
          width: 100%;
          background: transparent;
          border: none;
          color: #c9d1d9;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          outline: none;
        }

        .terminal-hint {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          color: #8b949e;
          opacity: 0.35;
          pointer-events: none;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          white-space: nowrap;
        }

        /* Problems panel */
        .panel-body {
          flex: 1;
          padding: 12px;
          background: #1e1e1e;
          overflow-y: auto;
        }

        .problems-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .no-problems {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #3fb950;
          font-size: 0.85rem;
        }

        .problems-hint {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .hint-text {
          color: #8b949e;
          font-size: 0.75rem;
        }

        /* Output panel */
        .output-panel {
          padding: 8px 12px;
        }

        .output-content {
          margin: 0;
          color: #8b949e;
          font-size: 0.75rem;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        /* Status bar */
        .ide-statusbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 22px;
          padding: 0 8px;
          background: #007acc;
          font-size: 0.7rem;
          color: #ffffff;
          flex-shrink: 0;
        }

        .status-left, .status-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 4px;
          cursor: pointer;
          transition: background 0.15s ease;
          border-radius: 2px;
        }

        .status-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .status-item svg {
          width: 12px;
          height: 12px;
        }

        /* Scrollbar styling */
        .explorer-tree::-webkit-scrollbar,
        .code-editor::-webkit-scrollbar,
        .terminal-body::-webkit-scrollbar,
        .panel-body::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .explorer-tree::-webkit-scrollbar-track,
        .code-editor::-webkit-scrollbar-track,
        .terminal-body::-webkit-scrollbar-track,
        .panel-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .explorer-tree::-webkit-scrollbar-thumb,
        .code-editor::-webkit-scrollbar-thumb,
        .terminal-body::-webkit-scrollbar-thumb,
        .panel-body::-webkit-scrollbar-thumb {
          background: rgba(121, 121, 121, 0.4);
          border-radius: 5px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .explorer-tree::-webkit-scrollbar-thumb:hover,
        .code-editor::-webkit-scrollbar-thumb:hover,
        .terminal-body::-webkit-scrollbar-thumb:hover,
        .panel-body::-webkit-scrollbar-thumb:hover {
          background: rgba(121, 121, 121, 0.6);
          background-clip: padding-box;
        }

        /* Mobile responsive */
        @media (max-width: 900px) {
          .ide-component {
            height: auto;
            min-height: 500px;
          }

          .ide-layout {
            flex-direction: column;
          }

          .file-explorer {
            display: none;
          }

          .code-editor {
            max-height: 250px;
          }

          .terminal-panel {
            height: 150px;
          }
        }

        @media (max-width: 768px) {
          .ide-titlebar {
            height: 32px;
            padding: 0 8px;
          }

          .traffic-lights { gap: 6px; }
          .light { width: 10px; height: 10px; }
          .title-text { display: none; }

          .tab {
            padding: 6px 10px;
            font-size: 0.75rem;
          }

          .line-numbers { display: none; }

          .status-right { display: none; }

          .code-editor {
            max-height: 200px;
          }
        }

        /* Shutdown effect */
        .ide-component {
          position: relative;
        }

        .ide-component.shutting-down {
          pointer-events: none;
        }

        .shutdown-overlay {
          position: absolute;
          inset: 0;
          background: #000;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: tvShutdown 0.4s ease-out forwards;
        }

        .shutdown-line {
          width: 100%;
          height: 2px;
          background: #fff;
          box-shadow: 0 0 20px #fff, 0 0 40px #fff, 0 0 60px #fff;
          animation: lineCollapse 0.3s ease-out 0.2s forwards;
        }

        @keyframes tvShutdown {
          0% {
            background: #1e1e1e;
          }
          30% {
            background: #fff;
          }
          100% {
            background: #000;
          }
        }

        @keyframes lineCollapse {
          0% {
            transform: scaleX(1);
            opacity: 1;
          }
          100% {
            transform: scaleX(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
