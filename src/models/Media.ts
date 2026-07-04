import { ObjectId } from "mongodb";

export interface Media {
  _id?: ObjectId;
  fileName: string;
  folderId: ObjectId;
  uploadId: string;
  size: number;
  filePath: string;
  
  // SEO & Accessibility Fields
  altText?: string;
  title?: string;
  caption?: string;
  description?: string;
  isDeleted?: boolean;
  createdAt: Date;
}
