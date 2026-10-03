import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  taskId: number;

  @Column()
  senderId: number;

  @Column({ length: 32 })
  senderRole: string;

  @Column({ length: 64 })
  senderName: string;

  @Column({ length: 1000 })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
