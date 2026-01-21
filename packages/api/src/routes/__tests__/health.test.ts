/**
 * Tests for Health Routes
 */

import express, { Express } from 'express';
import request from 'supertest';
import { createHealthRoutes } from '../health';
import { HealthCheckService, HealthStatus, ReadinessStatus, LivenessStatus } from '../../services/HealthCheckService';

// Mock HealthCheckService
class MockHealthCheckService {
  private healthStatus: HealthStatus = {
    healthy: true,
    services: { database: true, pos: true },
    lastChecked: new Date(),
  };
  private readinessStatus: ReadinessStatus = { ready: true };
  private livenessStatus: LivenessStatus = { alive: true, uptime: 100 };

  async checkHealth(): Promise<HealthStatus> {
    return this.healthStatus;
  }

  async getReadiness(): Promise<ReadinessStatus> {
    return this.readinessStatus;
  }

  async getLiveness(): Promise<LivenessStatus> {
    return this.livenessStatus;
  }

  // Test helpers
  setHealthStatus(status: HealthStatus): void {
    this.healthStatus = status;
  }

  setReadinessStatus(status: ReadinessStatus): void {
    this.readinessStatus = status;
  }

  setLivenessStatus(status: LivenessStatus): void {
    this.livenessStatus = status;
  }
}

describe('Health Routes', () => {
  let app: Express;
  let mockHealthService: MockHealthCheckService;

  beforeEach(() => {
    app = express();
    mockHealthService = new MockHealthCheckService();
    const healthRoutes = createHealthRoutes(mockHealthService as unknown as HealthCheckService);
    app.use('/api/health', healthRoutes);
  });

  describe('GET /api/health', () => {
    it('returns 200 when healthy', async () => {
      mockHealthService.setHealthStatus({
        healthy: true,
        services: { database: true, pos: true },
        lastChecked: new Date(),
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.healthy).toBe(true);
    });

    it('returns 503 when unhealthy', async () => {
      mockHealthService.setHealthStatus({
        healthy: false,
        services: { database: false, pos: true },
        lastChecked: new Date(),
        message: 'Unhealthy services: database',
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(true); // Success true because response was sent
      expect(response.body.data.healthy).toBe(false);
    });

    it('includes service status details', async () => {
      mockHealthService.setHealthStatus({
        healthy: true,
        services: { database: true, pos: true },
        lastChecked: new Date(),
      });

      const response = await request(app).get('/api/health');

      expect(response.body.data.services).toEqual({
        database: true,
        pos: true,
      });
    });

    it('includes error message when unhealthy', async () => {
      mockHealthService.setHealthStatus({
        healthy: false,
        services: { database: false, pos: false },
        lastChecked: new Date(),
        message: 'Unhealthy services: database, POS',
      });

      const response = await request(app).get('/api/health');

      expect(response.body.data.message).toBe('Unhealthy services: database, POS');
    });

    it('includes timestamp', async () => {
      const checkTime = new Date();
      mockHealthService.setHealthStatus({
        healthy: true,
        services: { database: true, pos: true },
        lastChecked: checkTime,
      });

      const response = await request(app).get('/api/health');

      expect(response.body.data.lastChecked).toBe(checkTime.toISOString());
    });
  });

  describe('GET /api/health/pos', () => {
    it('returns 200 when POS is healthy', async () => {
      mockHealthService.setHealthStatus({
        healthy: true,
        services: { database: true, pos: true },
        lastChecked: new Date(),
      });

      const response = await request(app).get('/api/health/pos');

      expect(response.status).toBe(200);
      expect(response.body.data.pos).toBe(true);
    });

    it('returns 503 when POS is unhealthy', async () => {
      mockHealthService.setHealthStatus({
        healthy: false,
        services: { database: true, pos: false },
        lastChecked: new Date(),
      });

      const response = await request(app).get('/api/health/pos');

      expect(response.status).toBe(503);
      expect(response.body.data.pos).toBe(false);
    });
  });

  describe('GET /api/health/ready', () => {
    it('returns 200 when ready', async () => {
      mockHealthService.setReadinessStatus({ ready: true });

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.data.ready).toBe(true);
    });

    it('returns 503 when not ready', async () => {
      mockHealthService.setReadinessStatus({
        ready: false,
        reason: 'database is not accessible',
      });

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.data.ready).toBe(false);
      expect(response.body.data.reason).toBe('database is not accessible');
    });

    it('indicates degraded mode', async () => {
      mockHealthService.setReadinessStatus({
        ready: true,
        degraded: true,
      });

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.data.ready).toBe(true);
      expect(response.body.data.degraded).toBe(true);
    });
  });

  describe('GET /api/health/live', () => {
    it('returns 200 when alive', async () => {
      mockHealthService.setLivenessStatus({ alive: true, uptime: 500 });

      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
      expect(response.body.data.alive).toBe(true);
    });

    it('includes uptime information', async () => {
      mockHealthService.setLivenessStatus({ alive: true, uptime: 12345 });

      const response = await request(app).get('/api/health/live');

      expect(response.body.data.uptime).toBe(12345);
    });
  });

  describe('Response format', () => {
    it('always includes success field', async () => {
      const endpoints = ['/api/health', '/api/health/pos', '/api/health/ready', '/api/health/live'];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.body).toHaveProperty('success');
      }
    });

    it('always includes data field', async () => {
      const endpoints = ['/api/health', '/api/health/pos', '/api/health/ready', '/api/health/live'];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.body).toHaveProperty('data');
      }
    });
  });
});
