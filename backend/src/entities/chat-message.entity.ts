import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

// 同一任务内的聊天记录（工人/主管/企业），作为客服争议裁决证据
@Entity('chat_messages')
@Index(['assignmentId'])
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assignmentId: number;

  @Column()
  senderId: number;

  @Column({ length: 32 })
  senderName: string;

  @Column({ length: 16 })
  senderRole: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
