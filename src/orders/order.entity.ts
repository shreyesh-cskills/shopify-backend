import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/decimal.transformer';
import { Product } from '../products/product.entity';

export enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  customerName: string;

  @Column({ length: 320 })
  customerEmail: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.Pending })
  status: OrderStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  total: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  productId: number;

  // RESTRICT: a product referenced by an order cannot be deleted.
  @ManyToOne(() => Product, { eager: true, onDelete: 'RESTRICT' })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  /** Price captured at order time, so later product price changes don't rewrite history. */
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  unitPrice: number;
}
