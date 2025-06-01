import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProfilePictureFields1735602000000 implements MigrationInterface {
  name = 'AddProfilePictureFields1735602000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'profile_picture_url',
      type: 'varchar',
      length: '500',
      isNullable: true,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'profile_picture_path',
      type: 'varchar',
      length: '500',
      isNullable: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'profile_picture_path');
    await queryRunner.dropColumn('users', 'profile_picture_url');
  }
} 