export class CreateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userData) {
    if (!userData.name || !userData.email) {
      throw new Error('Name and email are required');
    }

    const user = await this.userRepository.create(userData);
    return user;
  }
}

