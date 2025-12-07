// Test setup file
import { vi } from 'vitest';

// Mock environment variables
process.env.ENVIRONMENT = 'test';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.HOST_URL = 'http://localhost:3002';
