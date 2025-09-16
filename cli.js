#!/usr/bin/env node

/**
 * SAP Notes CLI - Test tool for getNote method
 * Usage: node cli.js get <noteId> [options]
 */

import { SapAuthenticator } from './dist/auth.js';
import { SapNotesApiClient } from './dist/sap-notes-api.js';
import { logger } from './dist/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class SapNotesCLI {
  constructor() {
    this.config = this.loadConfig();
    this.authenticator = new SapAuthenticator(this.config);
    this.sapNotesClient = new SapNotesApiClient(this.config);
  }

  loadConfig() {
    const config = {
      pfxPath: process.env.PFX_PATH || './certs/sap.pfx',
      pfxPassphrase: process.env.PFX_PASSPHRASE || '',
      maxJwtAgeH: parseInt(process.env.MAX_JWT_AGE_H || '12'),
      headful: process.env.HEADFUL === 'true',
      logLevel: process.env.LOG_LEVEL || 'info'
    };

    // Validate required configuration
    if (!config.pfxPath || !config.pfxPassphrase) {
      throw new Error('PFX_PATH and PFX_PASSPHRASE environment variables are required');
    }

    return config;
  }

  async getNote(noteId, lang = 'EN') {
    console.log(`\n📄 Getting SAP Note: ${noteId}`);
    console.log(`   Language: ${lang}`);
    console.log('⏳ Authenticating...');
    
    try {
      const token = await this.authenticator.ensureAuthenticated();
      console.log('✅ Authentication successful');
      
      console.log('📡 Fetching note details...');
      const note = await this.sapNotesClient.getNote(noteId, token);
      
      if (!note) {
        console.log('❌ Note not found or not accessible');
        return null;
      }
      
      console.log(`\n📋 SAP Note Details\n`);
      console.log(`**Basic Information:**`);
      console.log(`- ID: ${note.id}`);
      console.log(`- Title: ${note.title}`);
      console.log(`- Component: ${note.component || 'N/A'}`);
      console.log(`- Priority: ${note.priority || 'N/A'}`);
      console.log(`- Category: ${note.category || 'N/A'}`);
      console.log(`- Language: ${note.language}`);
      console.log(`- Release Date: ${note.releaseDate}`);
      console.log(`- URL: ${note.url}`);
      console.log('');
      
      console.log(`**Summary:**`);
      console.log(note.summary);
      console.log('');
      
      if (note.content) {
        console.log(`**Content Preview:**`);
        // Remove HTML tags and show first 500 characters
        const cleanContent = note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const preview = cleanContent.length > 500 ? cleanContent.substring(0, 500) + '...' : cleanContent;
        console.log(preview);
        console.log('');
      }
      
      if (note.prerequisites && note.prerequisites.length > 0) {
        console.log(`**Prerequisites (${note.prerequisites.length} items):**`);
        note.prerequisites.forEach((prereq, index) => {
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
        console.log('');
      }
      
      if (note.attachments && note.attachments.length > 0) {
        console.log(`**Attachments (${note.attachments.length} items):**`);
        note.attachments.forEach((attachment, index) => {
          console.log(`${index + 1}. ${attachment.name} (${attachment.type || 'Unknown type'})`);
          if (attachment.size) console.log(`   Size: ${attachment.size}`);
          console.log(`   URL: ${attachment.url}`);
        });
        console.log('');
      }
      
      console.log(`**Full Content Length:** ${note.content ? note.content.length : 0} characters`);
      
      return note;
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }

  printUsage() {
    console.log(`
📋 SAP Notes CLI - Get Note Tool

Usage:
  node cli.js get <noteId> [options]

Commands:
  get <noteId>           Get SAP Note details by ID

Options:
  --lang <language>      Language (EN|DE) [default: EN]
  --help, -h             Show this help message

Examples:
  node cli.js get 3635352
  node cli.js get 3635352 --lang EN
  node cli.js get 3552903 --lang DE

Environment Variables:
  PFX_PATH              Path to PFX certificate file
  PFX_PASSPHRASE       Passphrase for PFX certificate
  HEADFUL              Set to 'true' to show browser (default: false)
  LOG_LEVEL            Log level (debug|info|warn|error)
`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    const cli = new SapNotesCLI();
    cli.printUsage();
    process.exit(0);
  }
  
  if (args[0] === 'get') {
    if (args.length < 2) {
      console.error('❌ Error: Note ID is required');
      console.log('Usage: node cli.js get <noteId> [options]');
      process.exit(1);
    }
    
    const noteId = args[1];
    let lang = 'EN';
    
    // Parse options
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--lang' && i + 1 < args.length) {
        lang = args[i + 1];
        i++; // Skip next argument
      }
    }
    
    const cli = new SapNotesCLI();
    
    try {
      await cli.getNote(noteId, lang);
      console.log('\n✅ Operation completed successfully');
    } catch (error) {
      console.error('\n❌ Operation failed:', error.message);
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown command: ${args[0]}`);
    console.log('Use --help for usage information');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Always run main for CLI
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

export default SapNotesCLI;
