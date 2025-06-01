import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Priority } from '../../entities/priority.entity';

/**
 * Priorities Service
 * 
 * Handles priority management for tickets.
 */
@Injectable()
export class PrioritiesService {
  constructor(
    @InjectRepository(Priority)
    private readonly priorityRepository: Repository<Priority>,
  ) {}

  /**
   * Get all priorities
   * 
   * @returns Array of priorities
   */
  async findAll(): Promise<Priority[]> {
    return this.priorityRepository.find({
      order: { level: 'ASC' },
    });
  }

  /**
   * Get priority by ID
   * 
   * @param id - Priority ID
   * @returns Priority entity
   */
  async findOne(id: string): Promise<Priority> {
    const priority = await this.priorityRepository.findOne({ where: { id } });
    if (!priority) {
      throw new NotFoundException('Priority not found');
    }
    return priority;
  }

  /**
   * Create a new priority
   * 
   * @param priorityData - Priority data
   * @returns Created priority
   */
  async create(priorityData: Partial<Priority>): Promise<Priority> {
    const priority = this.priorityRepository.create(priorityData);
    return this.priorityRepository.save(priority);
  }

  /**
   * Update priority
   * 
   * @param id - Priority ID
   * @param updateData - Update data
   * @returns Updated priority
   */
  async update(id: string, updateData: Partial<Priority>): Promise<Priority> {
    await this.priorityRepository.update(id, updateData);
    return this.findOne(id);
  }

  /**
   * Delete priority
   * 
   * @param id - Priority ID
   */
  async remove(id: string): Promise<void> {
    const result = await this.priorityRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Priority not found');
    }
  }
} 