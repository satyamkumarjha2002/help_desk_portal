import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketsService } from './tickets.service';
import { OpenAIService } from '../faq/services/openai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Ticket, TicketStatus } from '../../entities/ticket.entity';
import { TicketComment } from '../../entities/ticket-comment.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Priority } from '../../entities/priority.entity';
import { Category } from '../../entities/category.entity';
import { Department } from '../../entities/department.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketRepository: Repository<Ticket>;
  let departmentRepository: Repository<Department>;
  let categoryRepository: Repository<Category>;
  let priorityRepository: Repository<Priority>;
  let openAIService: OpenAIService;
  let notificationsService: NotificationsService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: UserRole.END_USER,
    departmentId: 'dept-1',
    isActive: true,
  } as User;

  const mockDepartments = [
    { id: 'dept-1', name: 'IT Support', description: 'Information Technology support', isActive: true },
    { id: 'dept-2', name: 'HR', description: 'Human Resources', isActive: true },
  ];

  const mockCategories = [
    { 
      id: 'cat-1', 
      name: 'Hardware Issue', 
      description: 'Computer hardware problems', 
      departmentId: 'dept-1',
      department: { name: 'IT Support' }
    },
    { 
      id: 'cat-2', 
      name: 'Software Issue', 
      description: 'Software problems', 
      departmentId: 'dept-1',
      department: { name: 'IT Support' }
    },
  ];

  const mockPriorities = [
    { id: 'pri-1', name: 'Low', level: 1 },
    { id: 'pri-2', name: 'Medium', level: 2 },
    { id: 'pri-3', name: 'High', level: 3 },
    { id: 'pri-4', name: 'Critical', level: 4 },
  ];

  const mockTicketRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };

  const mockDepartmentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCategoryRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPriorityRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOpenAIService = {
    isConfigured: jest.fn(),
    classifyTicketFields: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: getRepositoryToken(TicketComment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Priority),
          useValue: mockPriorityRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(Department),
          useValue: mockDepartmentRepository,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    ticketRepository = module.get<Repository<Ticket>>(getRepositoryToken(Ticket));
    departmentRepository = module.get<Repository<Department>>(getRepositoryToken(Department));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    priorityRepository = module.get<Repository<Priority>>(getRepositoryToken(Priority));
    openAIService = module.get<OpenAIService>(OpenAIService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    // Setup default mocks
    mockUserRepository.find.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    const createTicketDto: CreateTicketDto = {
      title: 'My laptop screen is broken',
      description: 'The screen on my Dell laptop has a crack and is not displaying properly. It happened when I dropped it this morning.',
    };

    const mockTicket = {
      id: 'ticket-1',
      ticketNumber: 'HD-2024-000001',
      ...createTicketDto,
      status: TicketStatus.OPEN,
      requesterId: mockUser.id,
      createdById: mockUser.id,
    };

    beforeEach(() => {
      mockTicketRepository.create.mockReturnValue(mockTicket);
      mockTicketRepository.save.mockResolvedValue(mockTicket);
      mockTicketRepository.findOne.mockResolvedValue({
        ...mockTicket,
        requester: mockUser,
        createdBy: mockUser,
      });
    });

    it('should create ticket with provided fields when all are present', async () => {
      const dtoWithFields: CreateTicketDto = {
        ...createTicketDto,
        departmentId: 'dept-1',
        categoryId: 'cat-1',
        priorityId: 'pri-2',
      };

      mockOpenAIService.isConfigured.mockReturnValue(true);

      const result = await service.createTicket(dtoWithFields, mockUser);

      expect(mockOpenAIService.classifyTicketFields).not.toHaveBeenCalled();
      expect(mockTicketRepository.create).toHaveBeenCalledWith({
        ...dtoWithFields,
        departmentId: 'dept-1',
        categoryId: 'cat-1',
        priorityId: 'pri-2',
        requesterId: mockUser.id,
        createdById: mockUser.id,
        status: TicketStatus.OPEN,
      });
    });

    it('should use AI classification when fields are missing and OpenAI is configured', async () => {
      mockOpenAIService.isConfigured.mockReturnValue(true);
      mockDepartmentRepository.find.mockResolvedValue(mockDepartments);
      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockPriorityRepository.find.mockResolvedValue(mockPriorities);

      const aiClassification = {
        departmentId: 'dept-1',
        categoryId: 'cat-1',
        priorityId: 'pri-3',
        confidence: {
          department: 0.85,
          category: 0.75,
          priority: 0.90,
        },
        reasoning: 'Hardware issue with laptop screen, classified as IT Support hardware issue with high priority due to work impact',
      };

      mockOpenAIService.classifyTicketFields.mockResolvedValue(aiClassification);

      const result = await service.createTicket(createTicketDto, mockUser);

      expect(mockOpenAIService.classifyTicketFields).toHaveBeenCalledWith({
        title: createTicketDto.title,
        description: createTicketDto.description,
        departments: mockDepartments.map(d => ({
          id: d.id,
          name: d.name,
          description: d.description,
        })),
        categories: mockCategories.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          departmentName: c.department.name,
        })),
        priorities: mockPriorities.map(p => ({
          id: p.id,
          name: p.name,
          level: p.level,
        })),
      });

      expect(mockTicketRepository.create).toHaveBeenCalledWith({
        ...createTicketDto,
        departmentId: 'dept-1',
        categoryId: 'cat-1',
        priorityId: 'pri-3',
        requesterId: mockUser.id,
        createdById: mockUser.id,
        status: TicketStatus.OPEN,
      });
    });

    it('should only use AI for missing fields when some are provided', async () => {
      const dtoWithPartialFields: CreateTicketDto = {
        ...createTicketDto,
        departmentId: 'dept-1', // Provided
        // categoryId and priorityId missing
      };

      mockOpenAIService.isConfigured.mockReturnValue(true);
      mockDepartmentRepository.find.mockResolvedValue(mockDepartments);
      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockPriorityRepository.find.mockResolvedValue(mockPriorities);

      const aiClassification = {
        departmentId: 'dept-2', // Should be ignored since dept-1 is provided
        categoryId: 'cat-1',
        priorityId: 'pri-3',
        confidence: {
          department: 0.85,
          category: 0.75,
          priority: 0.90,
        },
        reasoning: 'AI classification result',
      };

      mockOpenAIService.classifyTicketFields.mockResolvedValue(aiClassification);

      await service.createTicket(dtoWithPartialFields, mockUser);

      expect(mockTicketRepository.create).toHaveBeenCalledWith({
        ...dtoWithPartialFields,
        departmentId: 'dept-1', // Original value preserved
        categoryId: 'cat-1', // From AI
        priorityId: 'pri-3', // From AI
        requesterId: mockUser.id,
        createdById: mockUser.id,
        status: TicketStatus.OPEN,
      });
    });

    it('should proceed without AI when OpenAI is not configured', async () => {
      mockOpenAIService.isConfigured.mockReturnValue(false);

      await service.createTicket(createTicketDto, mockUser);

      expect(mockOpenAIService.classifyTicketFields).not.toHaveBeenCalled();
      expect(mockTicketRepository.create).toHaveBeenCalledWith({
        ...createTicketDto,
        departmentId: undefined,
        categoryId: undefined,
        priorityId: undefined,
        requesterId: mockUser.id,
        createdById: mockUser.id,
        status: TicketStatus.OPEN,
      });
    });

    it('should handle AI classification errors gracefully', async () => {
      mockOpenAIService.isConfigured.mockReturnValue(true);
      mockDepartmentRepository.find.mockResolvedValue(mockDepartments);
      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockPriorityRepository.find.mockResolvedValue(mockPriorities);

      mockOpenAIService.classifyTicketFields.mockRejectedValue(new Error('AI service error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.createTicket(createTicketDto, mockUser);

      expect(consoleSpy).toHaveBeenCalledWith('AI classification failed, proceeding without it:', expect.any(Error));
      expect(mockTicketRepository.create).toHaveBeenCalledWith({
        ...createTicketDto,
        departmentId: undefined,
        categoryId: undefined,
        priorityId: undefined,
        requesterId: mockUser.id,
        createdById: mockUser.id,
        status: TicketStatus.OPEN,
      });

      consoleSpy.mockRestore();
    });

    it('should log AI classification results for debugging', async () => {
      mockOpenAIService.isConfigured.mockReturnValue(true);
      mockDepartmentRepository.find.mockResolvedValue(mockDepartments);
      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockPriorityRepository.find.mockResolvedValue(mockPriorities);

      const aiClassification = {
        departmentId: 'dept-1',
        categoryId: 'cat-1',
        priorityId: 'pri-3',
        confidence: {
          department: 0.85,
          category: 0.75,
          priority: 0.90,
        },
        reasoning: 'Test reasoning',
      };

      mockOpenAIService.classifyTicketFields.mockResolvedValue(aiClassification);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.createTicket(createTicketDto, mockUser);

      expect(consoleSpy).toHaveBeenCalledWith('AI Classification Result:', {
        originalFields: {
          departmentId: undefined,
          categoryId: undefined,
          priorityId: undefined,
        },
        aiSuggestions: {
          departmentId: 'dept-1',
          categoryId: 'cat-1',
          priorityId: 'pri-3',
        },
        finalFields: {
          departmentId: 'dept-1',
          categoryId: 'cat-1',
          priorityId: 'pri-3',
        },
        confidence: aiClassification.confidence,
        reasoning: 'Test reasoning',
      });

      consoleSpy.mockRestore();
    });
  });
}); 