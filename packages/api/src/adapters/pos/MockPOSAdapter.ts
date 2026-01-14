import { OrderStatus } from '@drink-ux/shared';
import {
  POSAdapter,
  POSCredentials,
  TokenResult,
  RawCatalogData,
  CatalogItem,
  CatalogModifier,
  OrderSubmission,
} from './POSAdapter';

type MethodName = keyof POSAdapter;

/**
 * Mock POS Adapter for testing
 * Allows configuring responses, simulating errors, and tracking calls
 */
export class MockPOSAdapter implements POSAdapter {
  private credentials: POSCredentials | null = null;
  private errors: Map<MethodName, Error> = new Map();
  private calls: Map<string, unknown[][]> = new Map();

  // Configurable responses
  private tokenResponse: TokenResult = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    merchantId: 'mock-merchant-id',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };

  private catalogResponse: RawCatalogData = {
    items: [
      { id: 'mock-item-1', name: 'Mock Latte', price: 500 },
      { id: 'mock-item-2', name: 'Mock Cappuccino', price: 550 },
    ],
    modifiers: [
      { id: 'mock-mod-1', name: 'Mock Vanilla', price: 75 },
    ],
    categories: [
      { id: 'mock-cat-1', name: 'Mock Coffee', ordinal: 1 },
    ],
  };

  private pushItemResponse: string = 'mock-pos-item-id';
  private pushModifierResponse: string = 'mock-pos-modifier-id';

  // Configuration methods
  setTokenResponse(tokens: TokenResult): void {
    this.tokenResponse = tokens;
  }

  setCatalogResponse(catalog: RawCatalogData): void {
    this.catalogResponse = catalog;
  }

  setPushItemResponse(posItemId: string): void {
    this.pushItemResponse = posItemId;
  }

  setPushModifierResponse(posModifierId: string): void {
    this.pushModifierResponse = posModifierId;
  }

  setError(method: MethodName, error: Error): void {
    this.errors.set(method, error);
  }

  // Call tracking
  getCalls(method: string): unknown[][] {
    return this.calls.get(method) || [];
  }

  wasCalledWith(method: string, ...args: unknown[]): boolean {
    const calls = this.getCalls(method);
    return calls.some(call =>
      args.every((arg, i) => call[i] === arg)
    );
  }

  reset(): void {
    this.calls.clear();
    this.errors.clear();
  }

  private trackCall(method: string, args: unknown[]): void {
    if (!this.calls.has(method)) {
      this.calls.set(method, []);
    }
    this.calls.get(method)!.push(args);
  }

  private checkError(method: MethodName): void {
    const error = this.errors.get(method);
    if (error) {
      throw error;
    }
  }

  // POSAdapter implementation
  setCredentials(credentials: POSCredentials): void {
    this.trackCall('setCredentials', [credentials]);
    this.credentials = credentials;
  }

  getAuthorizationUrl(state: string): string {
    this.trackCall('getAuthorizationUrl', [state]);
    this.checkError('getAuthorizationUrl');
    return `mock://oauth/authorize?state=${state}&client_id=mock-app`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResult> {
    this.trackCall('exchangeCodeForTokens', [code]);
    this.checkError('exchangeCodeForTokens');
    return { ...this.tokenResponse };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResult> {
    this.trackCall('refreshTokens', [refreshToken]);
    this.checkError('refreshTokens');
    return {
      ...this.tokenResponse,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  async importCatalog(): Promise<RawCatalogData> {
    this.trackCall('importCatalog', []);
    this.checkError('importCatalog');
    return { ...this.catalogResponse };
  }

  async pushItem(item: CatalogItem): Promise<string> {
    this.trackCall('pushItem', [item]);
    this.checkError('pushItem');
    return this.pushItemResponse;
  }

  async pushModifier(modifier: CatalogModifier): Promise<string> {
    this.trackCall('pushModifier', [modifier]);
    this.checkError('pushModifier');
    return this.pushModifierResponse;
  }

  async updateItem(posItemId: string, item: CatalogItem): Promise<void> {
    this.trackCall('updateItem', [posItemId, item]);
    this.checkError('updateItem');
  }

  // Stubbed methods - not yet implemented
  async createOrder(order: OrderSubmission): Promise<string> {
    this.trackCall('createOrder', [order]);
    this.checkError('createOrder');
    throw new Error('Not yet implemented - see drink-ux-frd');
  }

  async getOrderStatus(posOrderId: string): Promise<OrderStatus> {
    this.trackCall('getOrderStatus', [posOrderId]);
    this.checkError('getOrderStatus');
    throw new Error('Not yet implemented - see drink-ux-frd');
  }

  async getPaymentLink(orderId: string): Promise<string> {
    this.trackCall('getPaymentLink', [orderId]);
    this.checkError('getPaymentLink');
    throw new Error('Not yet implemented - see drink-ux-bd1');
  }
}
