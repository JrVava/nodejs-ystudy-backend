import { ObjectId } from "mongodb";

export interface GoogleSheetProvider {
    _id?: ObjectId;
    google_service_account_email: string;
    google_private_key: string;
    google_spreadsheet_id: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
