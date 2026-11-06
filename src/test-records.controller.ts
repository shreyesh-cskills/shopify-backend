import { Controller, Get } from '@nestjs/common';

// Static test data — no database needed.
const TEST_RECORDS = [
  { id: 1, name: 'Test Product 1', sku: 'TEST-001', price: 19.99, stock: 10, warranty: '1 year' },
  { id: 2, name: 'Test Product 2', sku: 'TEST-002', price: 29.99, stock: 5, warranty: '2 years' },
  { id: 3, name: 'Test Product 3', sku: 'TEST-003', price: 9.5, stock: 0, warranty: '6 months' },
  { id: 4, name: 'Test Product 4', sku: 'TEST-004', price: 149.0, stock: 25, warranty: '3 years' },
  { id: 5, name: 'Test Product 5', sku: 'TEST-005', price: 4.75, stock: 100, warranty: 'None' },
];

// Test route: GET /api/test-records
@Controller('test-records')
export class TestRecordsController {
  @Get()
  findAll() {
    return TEST_RECORDS;
  }
}
