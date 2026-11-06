import { Controller, Get } from '@nestjs/common';

// Test route: GET /api/hello
@Controller('hello')
export class HelloController {
  @Get()
  hello() {
    return { message: 'Hello World' };
  }
}
