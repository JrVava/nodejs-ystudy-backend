import { ObjectId } from "mongodb";

export interface Folder {
  _id?: ObjectId;
  name: string;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
