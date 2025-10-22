// users.service.ts
import { Injectable } from '@nestjs/common';
import { ReplicationService } from '../../database/providers/replication.service.js';
import { User } from '../entities/user.entity.js';

@Injectable()
export class UsersReplicationService {
  constructor(private replicationService: ReplicationService) {}

  // WRITE operations → Master
  async createUser(data: Partial<User>): Promise<User> {
    const masterRepo = this.replicationService
      .getMasterDataSource()
      .getRepository(User);

    const user = masterRepo.create(data);
    return await masterRepo.save(user);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const masterRepo = this.replicationService
      .getMasterDataSource()
      .getRepository(User);

    await masterRepo.update(id, data);
    return (await masterRepo.findOne({ where: { id } })) as User;
  }

  async deleteUser(id: string): Promise<void> {
    const masterRepo = this.replicationService
      .getMasterDataSource()
      .getRepository(User);

    await masterRepo.delete(id);
  }

  // READ operations → Slaves
  async findUserById(id: string): Promise<User> {
    const slaveRepo = this.replicationService
      .getSlaveDataSource()
      .getRepository(User);

    return (await slaveRepo.findOne({ where: { id } })) as User;
  }

  async findAllUsers(limit = 100): Promise<User[]> {
    const slaveRepo = this.replicationService
      .getSlaveDataSource()
      .getRepository(User);

    return await slaveRepo.find({ take: limit });
  }

  async searchUsers(query: string): Promise<User[]> {
    const slaveRepo = this.replicationService
      .getSlaveDataSource()
      .getRepository(User);

    return await slaveRepo
      .createQueryBuilder('user')
      .where('user.name ILIKE :query', { query: `%${query}%` })
      .getMany();
  }
}
