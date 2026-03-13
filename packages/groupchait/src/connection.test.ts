import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { RocketChatClient } from './rocketchat-client';
import { PaperclipClient } from './paperclip-client';

// Mock 'ws' module before imports that use it
vi.mock('ws', () => {
  const { EventEmitter: EE } = require('events');
  class MockWebSocket extends EE {
    close = vi.fn();
    constructor(public url: string) {
      super();
      // Simulate open event
      setTimeout(() => this.emit('open'), 0);
    }
  }
  return { default: MockWebSocket };
});

describe('Connection Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should authenticate with Rocket.Chat (mocked)', async () => {
    const rc = new RocketChatClient('https://chat.skibeness.com');
    
    // Mock fetch for login
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: { authToken: 'mock-token', userId: 'mock-user-id' }
      })
    });
    global.fetch = mockFetch;

    const creds = await rc.login('admin', 'password');
    
    expect(creds.authToken).toBe('mock-token');
    expect(creds.userId).toBe('mock-user-id');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/login'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should connect to Paperclip WebSocket stream', async () => {
    const pc = new PaperclipClient('http://localhost:3100', 'mock-api-key');
    const onEvent = vi.fn();

    const stopStream = pc.connectStream(onEvent);
    
    // Check if it returned a stop function
    expect(typeof stopStream).toBe('function');
    
    // Simulate incoming message
    const mockWs = (pc as any).ws;
    expect(mockWs).toBeDefined();
    
    const testEvent = { type: 'issue.status_changed', id: '123' };
    mockWs.emit('message', JSON.stringify(testEvent));
    
    expect(onEvent).toHaveBeenCalledWith(testEvent);
    
    // Close stream
    stopStream();
    expect(mockWs.close).toHaveBeenCalled();
  });
});
