import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AttachmentsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/attachments/upload (POST) - should upload a file', () => {
    return request(app.getHttpServer())
      .post('/attachments/upload')
      .attach('file', Buffer.from('test file content'), 'test.txt')
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('originalFilename', 'test.txt');
        expect(res.body).toHaveProperty('firebasePath');
        expect(res.body).toHaveProperty('fileSize');
        expect(res.body).toHaveProperty('mimeType');
      });
  });

  it('/attachments/upload-multiple (POST) - should upload multiple files', () => {
    return request(app.getHttpServer())
      .post('/attachments/upload-multiple')
      .attach('files', Buffer.from('test file 1'), 'test1.txt')
      .attach('files', Buffer.from('test file 2'), 'test2.txt')
      .expect(201)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
        expect(res.body[0]).toHaveProperty('originalFilename', 'test1.txt');
        expect(res.body[1]).toHaveProperty('originalFilename', 'test2.txt');
      });
  });

  it('/attachments/:id (GET) - should get attachment with download URL', async () => {
    // First upload a file
    const uploadResponse = await request(app.getHttpServer())
      .post('/attachments/upload')
      .attach('file', Buffer.from('test file content'), 'test.txt')
      .expect(201);

    const attachmentId = uploadResponse.body.id;

    // Then get the attachment
    return request(app.getHttpServer())
      .get(`/attachments/${attachmentId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id', attachmentId);
        expect(res.body).toHaveProperty('downloadUrl');
        expect(res.body.downloadUrl).toContain('storage.googleapis.com');
      });
  });
}); 