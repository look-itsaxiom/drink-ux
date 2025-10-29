import { SquareClient as Client, SquareEnvironment } from "square";
import { POSCredentials, POSConfig } from "@drink-ux/shared";

/**
 * SquareClient - Wrapper for Square SDK client
 * 
 * Provides a centralized way to create and configure Square SDK clients
 * based on partner credentials and configuration
 */
export class SquareClient {
  /**
   * Create a Square SDK client from POS credentials and config
   * 
   * @param credentials Partner's Square credentials
   * @param config Partner's Square configuration
   * @returns Configured Square SDK client
   */
  static createClient(credentials: POSCredentials, config: POSConfig): Client {
    if (!credentials.accessToken) {
      throw new Error("Square access token is required");
    }

    // Determine environment (sandbox vs production)
    const environment = this.getEnvironment(config);

    // Create and return the configured client
    return new Client({
      token: credentials.accessToken,
      environment,
    });
  }

  /**
   * Determine Square environment from configuration
   * Partners can specify sandbox mode for testing
   */
  private static getEnvironment(config: POSConfig): string {
    // Check if sandbox mode is explicitly specified in config
    // This allows partners to test integration before going live
    const useSandbox = (config as any).sandbox === true;
    
    return useSandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
  }

  /**
   * Validate that required credentials are present
   */
  static validateCredentials(credentials: POSCredentials): void {
    if (!credentials.accessToken) {
      throw new Error("Access token is required for Square integration");
    }
  }

  /**
   * Validate that required configuration is present
   */
  static validateConfig(config: POSConfig): void {
    if (!config.locationId) {
      throw new Error("Location ID is required for Square integration");
    }
  }
}
