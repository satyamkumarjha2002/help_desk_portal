import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { PrioritiesService } from './priorities.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';

/**
 * Priorities Controller
 * 
 * Handles priority management endpoints.
 */
@Controller('priorities')
@UseGuards(FirebaseAuthGuard)
export class PrioritiesController {
  constructor(private readonly prioritiesService: PrioritiesService) {}

  /**
   * Get all priorities
   * GET /priorities
   */
  @Get()
  async findAll() {
    return this.prioritiesService.findAll();
  }

  /**
   * Get priority by ID
   * GET /priorities/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prioritiesService.findOne(id);
  }
} 