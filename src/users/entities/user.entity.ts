import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Order } from 'src/orders/entities/order.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', {
    unique: true,
  })
  email: string;

  @Column('text', {
    select: false, 
  })
  password: string;

  @Column('text')
  fullName: string;

  @Column('text', {
    array: true,
    default: ['client'], 
  })
  roles: string[];

  @Column('boolean', {
    default: true,
  })
  isActive: boolean;

  @Column('text', {
    default: 'inactive', // 'active' | 'inactive' | 'break'
  })
  employeeStatus: string;

  @Column('text', {
    nullable: true,
  })
  vehicle: string; // 'Bicicleta' | 'Moto' | 'Carro' | 'Pickups'

  @Column('text', {
    nullable: true,
  })
  avatarUrl: string;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  // --- Hooks Criptográficos ---
  // Este método asegura que la contraseña jamás se guarde en texto plano
  @BeforeInsert()
  checkFieldsBeforeInsert() {
    this.email = this.email.toLowerCase().trim();
    this.password = bcrypt.hashSync(this.password, 10);
  }

  @BeforeUpdate()
  checkFieldsBeforeUpdate() {
    if (this.password) {
      this.password = bcrypt.hashSync(this.password, 10);
    }
  }
}