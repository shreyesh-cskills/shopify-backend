import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { Product } from '../products/product.entity';
import { Order, OrderItem, OrderStatus } from './order.entity';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

/**
 * Stock rule: an order holds stock for its items unless it is cancelled.
 * Every write runs in a transaction that releases the old hold and applies the new one,
 * with product rows locked so concurrent orders cannot oversell.
 */
@Injectable()
export class OrdersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  findAll() {
    return this.dataSource.getRepository(Order).find({ order: { id: 'DESC' } });
  }

  async findOne(id: number, manager: EntityManager = this.dataSource.manager) {
    const order = await manager.findOne(Order, { where: { id } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  create(dto: CreateOrderDto) {
    return this.dataSource.transaction(async (m) => {
      const status = dto.status ?? OrderStatus.Pending;
      const items = await this.buildItems(m, dto.items, status !== OrderStatus.Cancelled);
      const order = m.create(Order, {
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        status,
        items,
        total: this.sum(items),
      });
      const saved = await m.save(order);
      return this.findOne(saved.id, m);
    });
  }

  update(id: number, dto: UpdateOrderDto) {
    return this.dataSource.transaction(async (m) => {
      const order = await this.findOne(id, m);
      const newStatus = dto.status ?? order.status;
      const wasHolding = order.status !== OrderStatus.Cancelled;
      const willHold = newStatus !== OrderStatus.Cancelled;

      if (dto.items !== undefined || wasHolding !== willHold) {
        if (wasHolding) await this.releaseStock(m, order.items);
        const wanted =
          dto.items ?? order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
        const items = await this.buildItems(m, wanted, willHold, order.items);
        await m.delete(OrderItem, { order: { id } });
        order.items = items;
        order.total = this.sum(items);
      }

      if (dto.customerName !== undefined) order.customerName = dto.customerName;
      if (dto.customerEmail !== undefined) order.customerEmail = dto.customerEmail;
      order.status = newStatus;
      await m.save(order);
      return this.findOne(id, m);
    });
  }

  remove(id: number) {
    return this.dataSource.transaction(async (m) => {
      const order = await this.findOne(id, m);
      if (order.status !== OrderStatus.Cancelled) await this.releaseStock(m, order.items);
      await m.remove(order);
    });
  }

  private sum(items: OrderItem[]) {
    return Math.round(items.reduce((t, i) => t + i.unitPrice * i.quantity, 0) * 100) / 100;
  }

  /**
   * Turn requested lines into OrderItems (duplicate product lines are merged).
   * Products already on the order keep their captured unit price; new lines take the
   * current product price.
   */
  private async buildItems(
    m: EntityManager,
    lines: OrderItemDto[],
    reserve: boolean,
    previous: OrderItem[] = [],
  ) {
    const merged = new Map<number, number>();
    for (const l of lines) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.quantity);

    const ids = [...merged.keys()];
    const products = await m.find(Product, {
      where: { id: In(ids) },
      lock: { mode: 'pessimistic_write' },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const missing = ids.filter((pid) => !byId.has(pid));
    if (missing.length) throw new BadRequestException(`Unknown product id(s): ${missing.join(', ')}`);

    const prevPrice = new Map(previous.map((i) => [i.productId, i.unitPrice]));
    const items: OrderItem[] = [];
    for (const [productId, quantity] of merged) {
      const product = byId.get(productId)!;
      if (reserve) {
        if (product.stock < quantity) {
          throw new BadRequestException(
            `Not enough stock for "${product.name}" (requested ${quantity}, available ${product.stock})`,
          );
        }
        product.stock -= quantity;
      }
      items.push(
        m.create(OrderItem, {
          productId,
          product,
          quantity,
          unitPrice: prevPrice.get(productId) ?? product.price,
        }),
      );
    }
    if (reserve) await m.save(Product, products);
    return items;
  }

  private async releaseStock(m: EntityManager, items: OrderItem[]) {
    for (const item of items) {
      await m.increment(Product, { id: item.productId }, 'stock', item.quantity);
    }
  }
}
