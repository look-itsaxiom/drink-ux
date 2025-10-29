import { describe, it, expect } from "@jest/globals";
import { POSProvider } from "@drink-ux/shared";
import { POSProviderFactory } from "../POSProviderFactory";
import { SquarePOSProvider } from "../providers/SquarePOSProvider";
import { ToastPOSProvider } from "../providers/ToastPOSProvider";
import { CloverPOSProvider } from "../providers/CloverPOSProvider";

describe("POSProviderFactory", () => {
  describe("getProvider", () => {
    it("should return SquarePOSProvider for SQUARE provider", () => {
      const provider = POSProviderFactory.getProvider(POSProvider.SQUARE);
      expect(provider).toBeInstanceOf(SquarePOSProvider);
    });

    it("should return ToastPOSProvider for TOAST provider", () => {
      const provider = POSProviderFactory.getProvider(POSProvider.TOAST);
      expect(provider).toBeInstanceOf(ToastPOSProvider);
    });

    it("should return CloverPOSProvider for CLOVER provider", () => {
      const provider = POSProviderFactory.getProvider(POSProvider.CLOVER);
      expect(provider).toBeInstanceOf(CloverPOSProvider);
    });

    it("should throw error for unsupported provider", () => {
      expect(() => {
        POSProviderFactory.getProvider("UNSUPPORTED" as POSProvider);
      }).toThrow("Unsupported POS provider");
    });

    it("should return cached provider instance on subsequent calls", () => {
      const provider1 = POSProviderFactory.getProvider(POSProvider.SQUARE);
      const provider2 = POSProviderFactory.getProvider(POSProvider.SQUARE);
      expect(provider1).toBe(provider2);
    });
  });

  describe("isProviderSupported", () => {
    it("should return true for supported providers", () => {
      expect(POSProviderFactory.isProviderSupported("square")).toBe(true);
      expect(POSProviderFactory.isProviderSupported("toast")).toBe(true);
      expect(POSProviderFactory.isProviderSupported("clover")).toBe(true);
    });

    it("should return false for unsupported providers", () => {
      expect(POSProviderFactory.isProviderSupported("unsupported")).toBe(false);
      expect(POSProviderFactory.isProviderSupported("")).toBe(false);
    });
  });

  describe("getSupportedProviders", () => {
    it("should return all supported providers", () => {
      const providers = POSProviderFactory.getSupportedProviders();
      expect(providers).toContain(POSProvider.SQUARE);
      expect(providers).toContain(POSProvider.TOAST);
      expect(providers).toContain(POSProvider.CLOVER);
      expect(providers).toHaveLength(3);
    });
  });
});
