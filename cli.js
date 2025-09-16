#!/usr/bin/env node

import { config } from 'dotenv';
import { join } from 'path';
import { SapAuthenticator } from './dist/auth.js';
import { SapNotesApiClient } from './dist/sap-notes-api.js';

// Load environment variables
config({ path: join(process.cwd(), '.env') });

class SapNotesCLI {
  constructor() {
    this.config = this.loadConfig();
    this.authenticator = new SapAuthenticator(this.config);
    this.sapNotesClient = new SapNotesApiClient(this.config);
  }

  loadConfig() {
    const requiredEnvVars = ['PFX_PATH', 'PFX_PASSPHRASE'];
    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
      pfxPath: join(process.cwd(), process.env.PFX_PATH),
      pfxPassphrase: process.env.PFX_PASSPHRASE,
      maxJwtAgeH: parseInt(process.env.MAX_JWT_AGE_H || '12'),
      headful: process.env.HEADFUL === 'true',
      logLevel: process.env.LOG_LEVEL || 'info'
    };
  }

  async searchNotes(query, lang = 'EN', maxResults = 10) {
    console.log(`\n🔍 Searching SAP Notes for: "${query}"`);
    console.log('⏳ Authenticating...');
    
    try {
      const token = await this.authenticator.ensureAuthenticated();
      console.log('✅ Authentication successful');
      
      console.log('📡 Fetching results...');
      const searchResponse = await this.sapNotesClient.searchNotes(query, token, maxResults);
      
      console.log(`\n📊 Found ${searchResponse.totalResults} results:\n`);
      
      searchResponse.results.forEach((note, index) => {
        console.log(`${index + 1}. SAP Note ${note.id}`);
        console.log(`   Title: ${note.title}`);
        console.log(`   Summary: ${note.summary}`);
        console.log(`   Component: ${note.component || 'Not specified'}`);
        console.log(`   Release Date: ${note.releaseDate}`);
        console.log(`   Language: ${note.language}`);
        console.log(`   URL: ${note.url}\n`);
      });
      
      return searchResponse;
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }

  async getNote(noteId, lang = 'EN') {
    console.log(`\n📄 Getting SAP Note: ${noteId}`);
    console.log('⏳ Authenticating...');
    
    try {
      const token = await this.authenticator.ensureAuthenticated();
      console.log('✅ Authentication successful');
      
      console.log('📡 Fetching note details...');
      const noteDetail = await this.sapNotesClient.getNote(noteId, token);
      
      if (!noteDetail) {
        console.log('❌ Note not found or not accessible');
        return null;
      }
      
      console.log(`\n📋 SAP Note ${noteDetail.id} - Detailed Information\n`);
      console.log(`Title: ${noteDetail.title}`);
      console.log(`Summary: ${noteDetail.summary}`);
      console.log(`Component: ${noteDetail.component || 'Not specified'}`);
      console.log(`Priority: ${noteDetail.priority || 'Not specified'}`);
      console.log(`Category: ${noteDetail.category || 'Not specified'}`);
      console.log(`Release Date: ${noteDetail.releaseDate}`);
      console.log(`Language: ${noteDetail.language}`);
      console.log(`URL: ${noteDetail.url}`);
      
      // Extract prerequisites if available
      if (noteDetail.content) {
        const prerequisites = this.extractPrerequisites(noteDetail.content);
        if (prerequisites.length > 0) {
          console.log(`\n📋 Prerequisites:`);
          prerequisites.forEach((prereq, index) => {
            console.log(`${index + 1}. ${prereq}`);
          });
        }
      }
      
      return noteDetail;
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }

  async getNotePreconditions(noteId, lang = 'EN', softwareComponent = null, version = null) {
    console.log(`\n📋 Getting Prerequisites for SAP Note: ${noteId}`);
    if (softwareComponent) console.log(`   Software Component: ${softwareComponent}`);
    if (version) console.log(`   Version: ${version}`);
    console.log('⏳ Authenticating...');
    
    try {
      const token = await this.authenticator.ensureAuthenticated();
      console.log('✅ Authentication successful');
      
      console.log('📡 Fetching prerequisites...');
      const preconditions = await this.sapNotesClient.getNotePreconditions(
        noteId, 
        token, 
        softwareComponent, 
        version
      );
      
      if (!preconditions || preconditions.length === 0) {
        console.log('❌ No prerequisites found or note not accessible');
        return null;
      }
      
      console.log(`\n📋 Prerequisites for SAP Note ${noteId}\n`);
      
      // Add filter information if provided
      if (softwareComponent || version) {
        console.log(`**Filters Applied:**`);
        if (softwareComponent) {
          console.log(`- Software Component: ${softwareComponent}`);
        }
        if (version) {
          console.log(`- Version: ${version}`);
        }
        console.log('');
      }
      
      // Display prerequisites
      preconditions.forEach((prereq, index) => {
        if (typeof prereq === 'string') {
          console.log(`${index + 1}. ${prereq}`);
        } else if (typeof prereq === 'object' && prereq.noteId) {
          console.log(`${index + 1}. SAP Note ${prereq.noteId}`);
          if (prereq.title) console.log(`   Title: ${prereq.title}`);
          if (prereq.component) console.log(`   Component: ${prereq.component}`);
          if (prereq.validFrom && prereq.validFrom !== 'N/A') console.log(`   Valid From: ${prereq.validFrom}`);
          if (prereq.validTo && prereq.validTo !== 'N/A') console.log(`   Valid To: ${prereq.validTo}`);
          console.log('');
        } else {
          console.log(`${index + 1}. ${JSON.stringify(prereq)}`);
        }
      });
      
      return preconditions;
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }

  extractPrerequisites(content) {
    const prerequisites = [];
    const lines = content.split('\n');
    
    let inPrerequisitesSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for prerequisites section
      if (trimmedLine.toUpperCase().includes('PREREQUISITES') || 
          trimmedLine.toUpperCase().includes('PRÉ-REQUISITOS') ||
          trimmedLine.toUpperCase().includes('REQUIREMENTS')) {
        inPrerequisitesSection = true;
        continue;
      }
      
      // Stop at next section
      if (inPrerequisitesSection && trimmedLine.includes('---') && trimmedLine.length > 10) {
        break;
      }
      
      // Collect prerequisite lines
      if (inPrerequisitesSection && trimmedLine.length > 0 && 
          !trimmedLine.includes('---') && !trimmedLine.includes('===')) {
        prerequisites.push(trimmedLine);
      }
    }
    
    return prerequisites;
  }

  printUsage() {
    console.log(`
🔧 SAP Notes CLI - Command Line Interface

Usage:
  node cli.js search <query> [options]
  node cli.js get <note-id> [options]
  node cli.js preconditions <note-id> [options]
  node cli.js help

Commands:
  search <query>           Search SAP Notes by text or note ID
  get <note-id>            Get detailed information for a specific note
  preconditions <note-id>  Get prerequisites for a specific note with optional filtering
  help                     Show this help message

Options:
  --lang <lang>            Language (EN|DE, default: EN)
  --max <number>           Maximum results for search (default: 10)
  --component <component>  Software Component filter (e.g., S4CORE)
  --version <version>      Version filter (e.g., 108)

Examples:
  node cli.js search "authentication error"
  node cli.js search "3552903"
  node cli.js get 3552903
  node cli.js get 3552903 --lang EN
  node cli.js preconditions 3635352
  node cli.js preconditions 3635352 --component S4CORE --version 108
  node cli.js search "certificate" --max 5
    `);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help') {
    const cli = new SapNotesCLI();
    cli.printUsage();
    return;
  }
  
  const command = args[0];
  const cli = new SapNotesCLI();
  
  try {
    switch (command) {
      case 'search':
        if (args.length < 2) {
          console.error('❌ Error: Query required for search command');
          cli.printUsage();
          return;
        }
        
        const query = args[1];
        const searchLang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'EN';
        const maxResults = args.includes('--max') ? parseInt(args[args.indexOf('--max') + 1]) : 10;
        
        await cli.searchNotes(query, searchLang, maxResults);
        break;
        
      case 'get':
        if (args.length < 2) {
          console.error('❌ Error: Note ID required for get command');
          cli.printUsage();
          return;
        }
        
        const noteId = args[1];
        const getLang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'EN';
        
        await cli.getNote(noteId, getLang);
        break;
        
      case 'preconditions':
        if (args.length < 2) {
          console.error('❌ Error: Note ID required for preconditions command');
          cli.printUsage();
          return;
        }
        
        const preconditionsNoteId = args[1];
        const preconditionsLang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'EN';
        const softwareComponent = args.includes('--component') ? args[args.indexOf('--component') + 1] : null;
        const version = args.includes('--version') ? args[args.indexOf('--version') + 1] : null;
        
        await cli.getNotePreconditions(preconditionsNoteId, preconditionsLang, softwareComponent, version);
        break;
        
      default:
        console.error(`❌ Error: Unknown command "${command}"`);
        cli.printUsage();
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await cli.authenticator.destroy();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

main();
