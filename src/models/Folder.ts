import { ObjectId } from "mongodb";

export interface Folder {
  _id?: ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
