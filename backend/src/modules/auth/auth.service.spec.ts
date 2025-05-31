import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../entities/user.entity';
import { FirebaseConfig } from '../../config/firebase.config';

// Mock Firebase Admin
jest.mock('../../config/firebase.config');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let configService: jest.Mocked<ConfigService>;

  const mockFirebaseAuth = {
    createUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
    verifyIdToken: jest.fn(),
    updateUser: jest.fn(),
    getUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    configService = module.get(ConfigService);

    // Mock Firebase Config
    (FirebaseConfig.getAuth as jest.Mock).mockReturnValue(mockFirebaseAuth);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'password123',
      displayName: 'New User',
      role: UserRole.END_USER,
    };

    it('should successfully register a new user', async () => {
      // Arrange
      const mockUser = { id: 'user-id', email: registerData.email } as User;
      userRepository.findOne.mockResolvedValue(null);
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'new-firebase-uid' });
      mockFirebaseAuth.setCustomUserClaims.mockResolvedValue(undefined);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.register(
        registerData.email,
        registerData.password,
        registerData.displayName,
        registerData.role
      );

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: registerData.email } });
      expect(mockFirebaseAuth.createUser).toHaveBeenCalledWith({
        email: registerData.email,
        password: registerData.password,
        displayName: registerData.displayName,
        emailVerified: false,
      });
      expect(mockFirebaseAuth.setCustomUserClaims).toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      const mockUser = { id: 'user-id', email: registerData.email } as User;
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.register(registerData.email, registerData.password, registerData.displayName)
      ).rejects.toThrow(ConflictException);
    });

    it('should handle Firebase creation errors', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);
      mockFirebaseAuth.createUser.mockRejectedValue(new Error('Firebase error'));

      // Act & Assert
      await expect(
        service.register(registerData.email, registerData.password, registerData.displayName)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyToken', () => {
    const mockToken = 'mock-firebase-token';
    const mockDecodedToken = { uid: 'firebase-uid-123' };

    it('should successfully verify token and return user', async () => {
      // Arrange
      const mockUser = { id: 'user-id', firebaseUid: 'firebase-uid-123', isActive: true } as User;
      mockFirebaseAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.verifyToken(mockToken);

      // Assert
      expect(mockFirebaseAuth.verifyIdToken).toHaveBeenCalledWith(mockToken);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid: mockDecodedToken.uid },
        relations: ['department'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found in database', async () => {
      // Arrange
      mockFirebaseAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      // Arrange
      const inactiveUser = { id: 'user-id', firebaseUid: 'firebase-uid-123', isActive: false } as User;
      mockFirebaseAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      userRepository.findOne.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle invalid token errors', async () => {
      // Arrange
      mockFirebaseAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateProfile', () => {
    const userId = 'user-id-123';
    const updateData = {
      displayName: 'Updated Name',
      role: UserRole.AGENT,
    };

    it('should successfully update user profile', async () => {
      // Arrange
      const mockUser = { 
        id: userId, 
        firebaseUid: 'firebase-uid-123',
        displayName: 'Old Name',
        role: UserRole.END_USER 
      } as User;
      const updatedUser = { ...mockUser, ...updateData } as User;
      
      userRepository.findOne.mockResolvedValue(mockUser);
      mockFirebaseAuth.updateUser.mockResolvedValue(undefined);
      mockFirebaseAuth.setCustomUserClaims.mockResolvedValue(undefined);
      userRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateProfile(userId, updateData);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockFirebaseAuth.updateUser).toHaveBeenCalledWith(mockUser.firebaseUid, {
        displayName: updateData.displayName,
      });
      expect(mockFirebaseAuth.setCustomUserClaims).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(result.displayName).toBe(updateData.displayName);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateProfile(userId, updateData)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserByFirebaseUid', () => {
    const firebaseUid = 'firebase-uid-123';

    it('should return user when found', async () => {
      // Arrange
      const mockUser = { id: 'user-id', firebaseUid } as User;
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserByFirebaseUid(firebaseUid);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { firebaseUid },
        relations: ['department'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserByFirebaseUid(firebaseUid)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserById', () => {
    const userId = 'user-id-123';

    it('should return user when found', async () => {
      // Arrange
      const mockUser = { id: userId } as User;
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserById(userId);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['department'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserById(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateUser', () => {
    const userId = 'user-id-123';

    it('should successfully deactivate user', async () => {
      // Arrange
      const mockUser = { 
        id: userId, 
        firebaseUid: 'firebase-uid-123',
        isActive: true 
      } as User;
      const deactivatedUser = { ...mockUser, isActive: false } as User;
      
      userRepository.findOne.mockResolvedValue(mockUser);
      mockFirebaseAuth.updateUser.mockResolvedValue(undefined);
      userRepository.save.mockResolvedValue(deactivatedUser);

      // Act
      const result = await service.deactivateUser(userId);

      // Assert
      expect(mockFirebaseAuth.updateUser).toHaveBeenCalledWith(mockUser.firebaseUid, {
        disabled: true,
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });
  });

  describe('reactivateUser', () => {
    const userId = 'user-id-123';

    it('should successfully reactivate user', async () => {
      // Arrange
      const inactiveUser = { 
        id: userId, 
        firebaseUid: 'firebase-uid-123',
        isActive: false 
      } as User;
      const reactivatedUser = { ...inactiveUser, isActive: true } as User;
      
      userRepository.findOne.mockResolvedValue(inactiveUser);
      mockFirebaseAuth.updateUser.mockResolvedValue(undefined);
      userRepository.save.mockResolvedValue(reactivatedUser);

      // Act
      const result = await service.reactivateUser(userId);

      // Assert
      expect(mockFirebaseAuth.updateUser).toHaveBeenCalledWith(inactiveUser.firebaseUid, {
        disabled: false,
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });
  });

  describe('syncUserFromFirebase', () => {
    const firebaseUid = 'firebase-uid-123';
    const mockFirebaseUser = {
      uid: firebaseUid,
      email: 'sync@example.com',
      displayName: 'Sync User',
      disabled: false,
    };

    it('should create new user when not found locally', async () => {
      // Arrange
      const mockUser = { id: 'user-id', firebaseUid } as User;
      mockFirebaseAuth.getUser.mockResolvedValue(mockFirebaseUser);
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.syncUserFromFirebase(firebaseUid);

      // Assert
      expect(mockFirebaseAuth.getUser).toHaveBeenCalledWith(firebaseUid);
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should update existing user when found locally', async () => {
      // Arrange
      const mockUser = { id: 'user-id', firebaseUid } as User;
      mockFirebaseAuth.getUser.mockResolvedValue(mockFirebaseUser);
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.syncUserFromFirebase(firebaseUid);

      // Assert
      expect(mockFirebaseAuth.getUser).toHaveBeenCalledWith(firebaseUid);
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('getRolePermissions', () => {
    it('should return correct permissions for each role', () => {
      // Test private method through reflection
      const getRolePermissions = (service as any).getRolePermissions.bind(service);

      expect(getRolePermissions(UserRole.SUPER_ADMIN)).toContain('all');
      expect(getRolePermissions(UserRole.ADMIN)).toContain('manage_users');
      expect(getRolePermissions(UserRole.MANAGER)).toContain('view_team_tickets');
      expect(getRolePermissions(UserRole.TEAM_LEAD)).toContain('assign_tickets');
      expect(getRolePermissions(UserRole.AGENT)).toContain('view_assigned_tickets');
      expect(getRolePermissions(UserRole.END_USER)).toContain('create_tickets');
    });

    it('should return END_USER permissions for unknown role', () => {
      const getRolePermissions = (service as any).getRolePermissions.bind(service);
      expect(getRolePermissions('unknown_role' as UserRole)).toEqual(['create_tickets', 'view_own_tickets']);
    });
  });
}); 