import {
  Column,
  Model,
  Table,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Provider } from '../types';

@Table({ tableName: 'provider_configs' })
export class ProviderConfig extends Model {
  @Column({
    allowNull: false,
    autoIncrement: true,
    unique: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.ENUM(...Object.values(Provider)),
    allowNull: false,
    unique: true,
  })
  provider: Provider;

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  config: {
    cookies: Record<string, string>;
    enabled: boolean;
    'User-Agent': string;
  };

  @CreatedAt createdAt: Date;
  @UpdatedAt updatedAt: Date;
}
