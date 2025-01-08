import {
  Column,
  Model,
  Table,
  DataType,
  Index,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'codes',
  timestamps: true,
  charset: 'utf8mb4',
})
export class Code extends Model {
  @Column({
    allowNull: false,
    autoIncrement: true,
    unique: true,
    primaryKey: true,
  })
  id: number;

  @Index('code_unique')
  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  code: string;

  @Column({
    type: DataType.TEXT,
    defaultValue: '',
  })
  message: string;

  @Column({
    allowNull: true,
    field: 'conversation_id',
  })
  conversationId: string;

  @Column({
    defaultValue: false,
  })
  used: boolean;

  @CreatedAt public createdAt: Date;
  @UpdatedAt public updatedAt: Date;
}
