// MCP Tool definitions
export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

export interface SapNoteSearchParams {
  q: string;
  lang?: 'EN' | 'DE';
}

export interface SapNoteGetParams {
  id: string;
  lang?: 'EN' | 'DE';
}

export interface SapNotePreconditionsParams {
  id: string;
  lang?: 'EN' | 'DE';
  softwareComponent?: string;
  version?: string;
}

// SAP Note data structures (from SAP Notes API)
export interface SapNote {
  id: string;
  title: string;
  releaseDate: string;
  component?: string;
  priority?: string;
  category?: string;
  language: string;
  summary: string;
  url: string;
}

export interface SapNoteDetail extends SapNote {
  content: string;
  prerequisites?: SapNotePrecondition[];
}

export interface SapNotePrecondition {
  noteId: string;
  title?: string;
  component: string;
  validFrom: string;
  validTo: string;
}

// Configuration and environment
export interface ServerConfig {
  pfxPath: string;
  pfxPassphrase: string;
  maxJwtAgeH: number;
  headful: boolean;
  logLevel: string;
}

// Error types
export interface ApiError {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
}

// Authentication state
export interface AuthState {
  token?: string;
  expiresAt?: number;
  isAuthenticated: boolean;
}

// MCP Server capabilities
export interface MCPCapabilities {
  tools: {
    sap_note_search: {
      description: string;
      inputSchema: object;
      examples: Array<SapNoteSearchParams>;
    };
    sap_note_get: {
      description: string;
      inputSchema: object;
      examples: Array<SapNoteGetParams>;
    };
  };
  resources: {
    'note-html': {
      description: string;
      mimeTypes: string[];
    };
  };
}

// JSON Schema definitions for validation
export const SAP_NOTE_SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    q: { type: 'string', description: 'Query string or Note ID (e.g. "2744792").' },
    lang: { type: 'string', enum: ['EN', 'DE'], default: 'EN' }
  },
  required: ['q'],
  additionalProperties: false
} as const;

export const SAP_NOTE_GET_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'SAP Note ID', pattern: '^[0-9]{6,8}$' },
    lang: { type: 'string', enum: ['EN', 'DE'], default: 'EN' }
  },
  required: ['id'],
  additionalProperties: false
} as const;

export const SAP_NOTE_PRECONDITIONS_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'SAP Note ID', pattern: '^[0-9]{6,8}$' },
    lang: { type: 'string', enum: ['EN', 'DE'], default: 'EN' },
    softwareComponent: { type: 'string', description: 'Software Component to filter by (e.g. S4CORE)' },
    version: { type: 'string', description: 'Version to filter by (e.g. 108)' }
  },
  required: ['id'],
  additionalProperties: false
} as const; 