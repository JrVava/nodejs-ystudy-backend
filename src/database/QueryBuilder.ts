import { Filter, Sort, Document, ObjectId, InsertOneResult, UpdateResult, DeleteResult, InsertManyResult, OptionalUnlessRequiredId, UpdateFilter } from "mongodb";
import { getDB } from "./mongo";

/**
 * A Generic Query Builder for MongoDB
 * Allows you to perform common database operations effortlessly across any collection.
 */
export class QueryBuilder<T extends Document = Document> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Internal helper to lazily get the MongoDB collection instance.
   * This ensures that `getDB()` is only called after the DB is connected.
   */
  private get collection() {
    return getDB().collection<T>(this.collectionName);
  }

  /**
   * Find multiple documents with optional filters, sorting, and pagination.
   */
  async find(
    filter: Filter<T> = {},
    options: {
      sort?: Sort;
      limit?: number;
      skip?: number;
      projection?: Document;
    } = {}
  ): Promise<T[]> {
    let query = this.collection.find(filter);

    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.projection) query = query.project(options.projection);

    return await query.toArray() as T[];
  }

  /**
   * Find a single document by a custom filter.
   */
  async findOne(filter: Filter<T>, projection?: Document): Promise<T | null> {
    const options = projection ? { projection } : undefined;
    return await this.collection.findOne(filter, options) as T | null;
  }

  /**
   * Find a single document specifically by its ObjectId.
   */
  async findById(id: string | ObjectId, projection?: Document): Promise<T | null> {
    const _id = typeof id === "string" ? new ObjectId(id) : id;
    return this.findOne({ _id } as unknown as Filter<T>, projection);
  }

  /**
   * Insert a single document.
   */
  async insertOne(doc: OptionalUnlessRequiredId<T>): Promise<InsertOneResult<T>> {
    return await this.collection.insertOne(doc);
  }

  /**
   * Insert multiple documents at once.
   */
  async insertMany(docs: OptionalUnlessRequiredId<T>[]): Promise<InsertManyResult<T>> {
    return await this.collection.insertMany(docs);
  }

  /**
   * Update a single document by filter.
   * Automatically wraps properties in `$set` if you forget to provide MongoDB operators.
   */
  async updateOne(filter: Filter<T>, update: UpdateFilter<T> | Partial<T>): Promise<UpdateResult<T>> {
    const hasOperator = Object.keys(update).some(key => key.startsWith('$'));
    const finalUpdate = hasOperator ? update : { $set: update };
    return await this.collection.updateOne(filter, finalUpdate as UpdateFilter<T>);
  }

  /**
   * Update a single document by its ObjectId.
   */
  async updateById(id: string | ObjectId, update: UpdateFilter<T> | Partial<T>): Promise<UpdateResult<T>> {
    const _id = typeof id === "string" ? new ObjectId(id) : id;
    return this.updateOne({ _id } as unknown as Filter<T>, update);
  }

  /**
   * Upsert a single document by filter.
   * If it exists, update it. If not, insert it.
   */
  async upsertOne(filter: Filter<T>, update: UpdateFilter<T> | Partial<T>): Promise<UpdateResult<T>> {
    const hasOperator = Object.keys(update).some(key => key.startsWith('$'));
    const finalUpdate = hasOperator ? update : { $set: update };
    return await this.collection.updateOne(filter, finalUpdate as UpdateFilter<T>, { upsert: true });
  }

  /**
   * Upsert a single document by its ObjectId.
   */
  async upsertById(id: string | ObjectId, update: UpdateFilter<T> | Partial<T>): Promise<UpdateResult<T>> {
    const _id = typeof id === "string" ? new ObjectId(id) : id;
    return this.upsertOne({ _id } as unknown as Filter<T>, update);
  }

  /**
   * Delete a single document by filter.
   */
  async deleteOne(filter: Filter<T>): Promise<DeleteResult> {
    return await this.collection.deleteOne(filter);
  }

  /**
   * Delete a single document by its ObjectId.
   */
  async deleteById(id: string | ObjectId): Promise<DeleteResult> {
    const _id = typeof id === "string" ? new ObjectId(id) : id;
    return this.deleteOne({ _id } as unknown as Filter<T>);
  }

  /**
   * Count documents matching a filter.
   */
  async count(filter: Filter<T> = {}): Promise<number> {
    return await this.collection.countDocuments(filter);
  }

  /**
   * Execute an advanced aggregation pipeline.
   */
  async aggregate(pipeline: Document[]): Promise<Document[]> {
    return await this.collection.aggregate(pipeline).toArray();
  }

  /**
   * Fetch a paginated list of documents alongside useful metadata.
   */
  async paginate(
    filter: Filter<T> = {},
    page: number = 1,
    limit: number = 10,
    sort?: Sort
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.find(filter, { skip, limit, sort }),
      this.count(filter)
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}
