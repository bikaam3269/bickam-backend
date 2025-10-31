import { UserRepository } from '../../domain/repositories/UserRepository.js';
import { User } from '../../domain/entities/User.js';

export class InMemoryUserRepository extends UserRepository {
  constructor() {
    super();
    this.users = [];
    this.nextId = 1;
  }

  async findById(id) {
    return this.users.find(user => user.id === id) || null;
  }

  async findAll() {
    return [...this.users];
  }

  async create(userData) {
    const user = new User(this.nextId++, userData.name, userData.email);
    this.users.push(user);
    return user;
  }

  async update(id, userData) {
    const userIndex = this.users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      return null;
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      id
    };

    return this.users[userIndex];
  }

  async delete(id) {
    const userIndex = this.users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      return false;
    }

    this.users.splice(userIndex, 1);
    return true;
  }
}

