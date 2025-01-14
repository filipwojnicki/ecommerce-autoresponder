import {
  Column,
  Model,
  Table,
  DataType,
  CreatedAt,
  UpdatedAt,
  Index,
  HasMany,
} from 'sequelize-typescript';
import { Code } from './code.model';

@Table({
  timestamps: true,
  charset: 'utf8mb4',
})
export class CodeOffer extends Model {
  @Column({
    allowNull: false,
    autoIncrement: true,
    unique: true,
    primaryKey: true,
  })
  id: number;

  @Index('codeoffer_title_unique')
  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  title: string;

  @Column({
    type: DataType.TEXT,
    defaultValue: '',
  })
  messageCorrect: string;

  @Column({
    type: DataType.TEXT,
    defaultValue: '',
  })
  messageFailed: string;

  @Column({
    defaultValue: true,
  })
  used: boolean;

  @CreatedAt public createdAt: Date;
  @UpdatedAt public updatedAt: Date;

  @HasMany(() => Code)
  codes: Code[];
}
