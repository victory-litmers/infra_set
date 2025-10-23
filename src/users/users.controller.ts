import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  CreateUserDto,
  UpdateUserDto,
  UsersShardingService,
} from './providers/sharding.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersShardingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.usersService.findAll(parsedLimit);
  }

  @Get('stats/distribution')
  getStats() {
    return this.usersService.getStats();
  }

  @Get('stats/health')
  healthCheck() {
    return this.usersService.healthCheck();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
