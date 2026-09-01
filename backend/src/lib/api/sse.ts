/**
 * Server-Sent Events (SSE) Utility
 * 
 * Provides real-time event streaming for:
 * - Notification updates
 * - Loan status changes
 * - Payment confirmations
 * - Dashboard metrics
 */

import { Request, Response } from 'express';

// =============================================================================
// TYPES
// =============================================================================

export interface SSEMessage {
  event?: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export interface SSEClient {
  id: string;
  userId?: string;
  tenantId?: string;
  channels: string[];
  lastActivity: Date;
  response: Response;
}

export interface SSEOptions {
  /**
   * Ping interval in milliseconds (keep-alive)
   * @default 30000 (30 seconds)
   */
  pingInterval?: number;

  /**
   * Max reconnect time in milliseconds
   * @default 5000 (5 seconds)
   */
  reconnectTime?: number;

  /**
   * Enable CORS
   * @default true
   */
  cors?: boolean;

  /**
   * Custom headers to set
   */
  headers?: Record<string, string>;
}

// =============================================================================
// SSE MANAGER CLASS
// =============================================================================

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private defaultOptions: Required<SSEOptions> = {
    pingInterval: 30000,
    reconnectTime: 5000,
    cors: true,
    headers: {},
  };

  /**
   * Initialize SSE manager with options
   */
  init(options: SSEOptions = {}): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
    
    // Start keep-alive pings
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      this.ping();
    }, this.defaultOptions.pingInterval);

    console.log(`[SSE] Manager initialized (ping: ${this.defaultOptions.pingInterval}ms)`);
  }

  /**
   * Add a new client connection
   */
  addClient(req: Request, res: Response, channels: string[] = []): SSEClient {
    const clientId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': this.defaultOptions.cors ? '*' : '',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET',
      ...this.defaultOptions.headers,
    });

    // Flush headers
    res.flushHeaders?.();

    // Create client object
    const client: SSEClient = {
      id: clientId,
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenantId || req.headers['x-tenant-id'] as string,
      channels,
      lastActivity: new Date(),
      response: res,
    };

    this.clients.set(clientId, client);

    // Send initial connection message
    this.sendToClient(client, {
      event: 'connected',
      data: {
        clientId,
        serverTime: new Date().toISOString(),
        channels,
        reconnectTime: this.defaultOptions.reconnectTime,
      },
    });

    // Handle client disconnect
    req.on('close', () => {
      this.removeClient(clientId);
    });

    console.log(`[SSE] Client connected: ${clientId} (${channels.join(', ')})`);
    
    return client;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`[SSE] Client disconnected: ${clientId}`);
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(client: SSEClient, message: SSEMessage): boolean {
    try {
      let data = `data: ${JSON.stringify(message.data)}\n`;
      
      if (message.event) {
        data = `event: ${message.event}\n${data}`;
      }
      
      if (message.id) {
        data = `id: ${message.id}\n${data}`;
      }
      
      if (message.retry) {
        data = `retry: ${message.retry}\n${data}`;
      }
      
      data += '\n';
      
      client.response.write(data);
      client.lastActivity = new Date();
      
      return true;
    } catch (error) {
      console.error(`[SSE] Error sending to client ${client.id}:`, error);
      this.removeClient(client.id);
      return false;
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: SSEMessage, filter?: (client: SSEClient) => boolean): number {
    let sentCount = 0;
    
    for (const [, client] of this.clients) {
      if (!filter || filter(client)) {
        if (this.sendToClient(client, message)) {
          sentCount++;
        }
      }
    }
    
    return sentCount;
  }

  /**
   * Send to clients subscribed to specific channel(s)
   */
  sendToChannel(channel: string, message: SSEMessage): number {
    return this.broadcast(message, (client) => 
      client.channels.length === 0 || client.channels.includes(channel)
    );
  }

  /**
   * Send to specific user's connections
   */
  sendToUser(userId: string, message: SSEMessage): number {
    return this.broadcast(message, (client) => client.userId === userId);
  }

  /**
   * Send to all clients of a tenant
   */
  sendToTenant(tenantId: string, message: SSEMessage): number {
    return this.broadcast(message, (client) => client.tenantId === tenantId);
  }

  /**
   * Send keep-alive ping to all clients
   */
  private ping(): void {
    this.broadcast({
      event: 'ping',
      data: { timestamp: new Date().toISOString() },
    });
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get active clients info (for monitoring)
   */
  getClientsInfo(): Array<{ id: string; userId?: string; channels: string[]; lastActivity: Date }> {
    return Array.from(this.clients.values()).map(c => ({
      id: c.id,
      userId: c.userId,
      channels: c.channels,
      lastActivity: c.lastActivity,
    }));
  }

  /**
   * Close all connections and cleanup
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        this.sendToClient(client, {
          event: 'shutdown',
          data: { message: 'Server shutting down' },
        });
        client.response.end();
      } catch {
        // Ignore errors during shutdown
      }
    }

    this.clients.clear();
    console.log('[SSE] Manager shutdown complete');
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Express middleware to handle SSE connections
 * 
 * Usage:
 * ```typescript
 * app.get('/events', authenticate, sseMiddleware(['notifications', 'loans']), (req, res) => {
 *   // Connection is now established
 * });
 * ```
 */
export function sseMiddleware(channels: string[] = []) {
  return (req: Request, res: Response, next: () => void) => {
    // Only accept GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Add client to SSE manager
    sseManager.addClient(req, res, channels);

    // Don't call next() - we're handling the response
  };
}

/**
 * Predefined event handlers for common use cases
 */
export const SSEEvents = {
  /**
   * New notification event
   */
  notification(notification: Record<string, unknown>): SSEMessage {
    return {
      event: 'notification',
      data: notification,
    };
  },

  /**
   * Loan status change event
   */
  loanStatusChanged(loanId: string, oldStatus: string, newStatus: string): SSEMessage {
    return {
      event: 'loan_status_changed',
      data: { loanId, oldStatus, newStatus, timestamp: new Date().toISOString() },
    };
  },

  /**
   * Payment received event
   */
  paymentReceived(payment: Record<string, unknown>): SSEMessage {
    return {
      event: 'payment_received',
      data: payment,
    };
  },

  /**
   * Application status update
   */
  applicationUpdate(applicationId: string, status: string, step?: string): SSEMessage {
    return {
      event: 'application_update',
      data: { applicationId, status, step, timestamp: new Date().toISOString() },
    };
  },

  /**
   * Dashboard metrics refresh trigger
   */
  dashboardRefresh(tenantId: string): SSEMessage {
    return {
      event: 'dashboard_refresh',
      data: { tenantId, trigger: 'data_change' },
    };
  },
};

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const sseManager = new SSEManager();

// Auto-initialize on import
if (process.env.NODE_ENV !== 'test') {
  sseManager.init();
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sseManager.shutdown();
});

process.on('SIGINT', () => {
  sseManager.shutdown();
});

// =============================================================================
// EXPORTS
// =============================================================================

export default SSEManager;
