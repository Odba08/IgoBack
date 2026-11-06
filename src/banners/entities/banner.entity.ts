import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BannerActionType = 'NONE' | 'EXTERNAL_URL' | 'INFO_MODAL';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  title: string;

  @Column('text')
  imageUrl: string;

  @Column('text', { default: 'NONE' })
  actionType: BannerActionType;

  @Column('text', { nullable: true })
  actionUrl?: string;

  @Column('text', { nullable: true })
  infoTitle?: string;

  @Column('text', { nullable: true })
  infoContent?: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('int', { default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

