/**
 * Type definitions for Square Web Payments SDK
 * https://developer.squareup.com/docs/web-payments/overview
 */

declare namespace Square {
  /**
   * Options for initializing the Payments object
   */
  interface PaymentOptions {
    /** Optional custom locale */
    locale?: string;
  }

  /**
   * The main Payments interface
   */
  interface Payments {
    /**
     * Create a Card payment method
     */
    card(options?: CardOptions): Promise<Card>;

    /**
     * Verify the buyer using Strong Customer Authentication
     */
    verifyBuyer(
      sourceId: string,
      verificationDetails: VerificationDetails
    ): Promise<VerificationResult>;

    /**
     * Set the locale for the payment forms
     */
    setLocale(locale: string): void;
  }

  /**
   * Options for creating a Card payment method
   */
  interface CardOptions {
    /** Custom CSS styles for the card input */
    style?: CardStyle;
    /** Postal code collection options */
    postalCode?: string;
    /** Whether to focus the first input automatically */
    includeInputLabels?: boolean;
  }

  /**
   * Styling options for card input
   */
  interface CardStyle {
    /** Styles for the input elements */
    input?: {
      backgroundColor?: string;
      color?: string;
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
    };
    /** Styles for placeholder text */
    'input::placeholder'?: {
      color?: string;
    };
    /** Styles for input labels */
    '.input-container'?: {
      borderColor?: string;
      borderRadius?: string;
    };
    /** Styles for focused state */
    '.input-container.is-focus'?: {
      borderColor?: string;
    };
    /** Styles for error state */
    '.input-container.is-error'?: {
      borderColor?: string;
    };
    /** Styles for message text */
    '.message-text'?: {
      color?: string;
    };
    /** Styles for message icon */
    '.message-icon'?: {
      color?: string;
    };
  }

  /**
   * Card payment method interface
   */
  interface Card {
    /**
     * Attach the card input to a DOM element
     * @param containerId - The ID of the container element (without #)
     */
    attach(containerId: string): Promise<void>;

    /**
     * Detach the card input from the DOM
     */
    destroy(): Promise<void>;

    /**
     * Tokenize the card information
     */
    tokenize(): Promise<TokenResult>;

    /**
     * Add event listener
     */
    addEventListener(
      eventType: CardEventType,
      callback: (event: CardInputEvent) => void
    ): void;

    /**
     * Remove event listener
     */
    removeEventListener(
      eventType: CardEventType,
      callback: (event: CardInputEvent) => void
    ): void;

    /**
     * Focus the card input
     */
    focus(field?: 'cardNumber' | 'cvv' | 'expirationDate' | 'postalCode'): void;

    /**
     * Reconfigure the card styling
     */
    configure(options: CardOptions): Promise<void>;
  }

  /**
   * Card event types
   */
  type CardEventType =
    | 'focusClassAdded'
    | 'focusClassRemoved'
    | 'errorClassAdded'
    | 'errorClassRemoved'
    | 'cardBrandChanged'
    | 'postalCodeChanged'
    | 'submit';

  /**
   * Card input event
   */
  interface CardInputEvent {
    /** The type of event */
    eventType: CardEventType;
    /** The field that triggered the event */
    field?: 'cardNumber' | 'cvv' | 'expirationDate' | 'postalCode';
    /** The card brand (if cardBrandChanged) */
    cardBrand?: CardBrand;
    /** The postal code value (if postalCodeChanged) */
    postalCodeValue?: string;
    /** Whether the current field value is valid */
    currentState?: {
      isCompletelyValid: boolean;
      isPotentiallyValid: boolean;
    };
  }

  /**
   * Supported card brands
   */
  type CardBrand =
    | 'visa'
    | 'masterCard'
    | 'americanExpress'
    | 'discover'
    | 'discoverDiners'
    | 'jcb'
    | 'chinaUnionPay'
    | 'squareGiftCard'
    | 'unknown';

  /**
   * Result from tokenizing a card
   */
  interface TokenResult {
    /** The status of the tokenization */
    status: 'OK' | 'ERROR';
    /** The payment token (if successful) */
    token?: string;
    /** Errors (if unsuccessful) */
    errors?: TokenError[];
    /** Details about the card */
    details?: CardDetails;
  }

  /**
   * Tokenization error
   */
  interface TokenError {
    /** Error type */
    type: string;
    /** Error message */
    message: string;
    /** Field that caused the error */
    field?: 'cardNumber' | 'cvv' | 'expirationDate' | 'postalCode';
  }

  /**
   * Card details from tokenization
   */
  interface CardDetails {
    /** Card brand */
    brand?: CardBrand;
    /** Last 4 digits */
    lastFour?: string;
    /** Expiration month */
    expMonth?: number;
    /** Expiration year */
    expYear?: number;
    /** Billing postal code */
    billing?: {
      postalCode?: string;
    };
    /** Card type */
    cardType?: 'CREDIT' | 'DEBIT' | 'PREPAID' | 'UNKNOWN';
    /** Prepaid type */
    prepaidType?: 'PREPAID' | 'NOT_PREPAID' | 'UNKNOWN';
  }

  /**
   * Verification details for SCA
   */
  interface VerificationDetails {
    /** Amount to charge */
    amount: string;
    /** Currency code (e.g., 'USD') */
    currencyCode: string;
    /** Payment intent */
    intent: 'CHARGE' | 'STORE';
    /** Billing contact info */
    billingContact?: {
      familyName?: string;
      givenName?: string;
      email?: string;
      phone?: string;
      addressLines?: string[];
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
    };
  }

  /**
   * Result from buyer verification
   */
  interface VerificationResult {
    /** The verification token */
    token?: string;
    /** Whether the user cancelled */
    userCancelled?: boolean;
  }
}

/**
 * Initialize the Square Web Payments SDK
 * @param applicationId - Your Square application ID
 * @param locationId - Your Square location ID
 * @returns Promise resolving to the Payments object
 */
declare function Square(
  applicationId: string,
  locationId: string
): Promise<Square.Payments>;

/**
 * Global Square object (for checking if SDK is loaded)
 */
interface Window {
  Square?: typeof Square;
}
