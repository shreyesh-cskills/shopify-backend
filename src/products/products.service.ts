import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {}

  findAll() {
    return this.repo.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    return this.save(this.repo.merge(product, dto));
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    try {
      await this.repo.remove(product);
    } catch (e) {
      if (e instanceof QueryFailedError && (e as any).code === FK_VIOLATION) {
        throw new ConflictException('Product is used in existing orders and cannot be deleted');
      }
      throw e;
    }
  }

  private async save(product: Product) {
    try {
      return await this.repo.save(product);
    } catch (e) {
      if (e instanceof QueryFailedError && (e as any).code === UNIQUE_VIOLATION) {
        throw new ConflictException(`SKU "${product.sku}" already exists`);
      }
      throw e;
    }
  }
}
