import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { GoogleSheetProvider } from "../../models/GoogleSheetProvider";

@JsonController("/google-sheet-provider")
@UseBefore(AdminMiddleware)
export class GoogleSheetProviderController {
    
    @Post("/add")
    async createGoogleSheetProvider(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const providerDB = new QueryBuilder<GoogleSheetProvider>("google_sheet_providers");

            const existingRecord = await providerDB.findOne({ isDeleted: { $ne: true } });
            if (existingRecord) {
                throw new HttpError(400, "Google Sheet Provider configuration already exists. Please use the update endpoint.");
            }

            const newProvider: GoogleSheetProvider = {
                google_service_account_email: decryptedBody.google_service_account_email,
                google_private_key: decryptedBody.google_private_key,
                google_spreadsheet_id: decryptedBody.google_spreadsheet_id,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await providerDB.insertOne(newProvider);

            return {
                data: encrypt({
                    success: true,
                    message: "Google Sheet Provider added successfully"
                })
            };
        } catch (error) {
            logger.error(`[GoogleSheetProviderController:createGoogleSheetProvider] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/pagination")
    async listGoogleSheetProviders(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const providerDB = new QueryBuilder<GoogleSheetProvider>("google_sheet_providers");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { google_service_account_email: { $regex: search, $options: "i" } },
                    { google_spreadsheet_id: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await providerDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    ...results
                })
            };
        } catch (error) {
            logger.error(`[GoogleSheetProviderController:listGoogleSheetProviders] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }


    @Get("/edit/:id")
    async getProviderById(@Param("id") id: string) {
        try {
            const providerDB = new QueryBuilder<GoogleSheetProvider>("google_sheet_providers");
            const record = await providerDB.findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } });

            if (!record) {
                throw new HttpError(404, "Google Sheet Provider not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: record
                })
            };
        } catch (error) {
            logger.error(`[GoogleSheetProviderController:getProviderById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateProvider(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const providerDB = new QueryBuilder<GoogleSheetProvider>("google_sheet_providers");

            const existingRecord = await providerDB.findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } });
            if (!existingRecord) {
                throw new HttpError(404, "Google Sheet Provider not found");
            }

            const updateData: any = { updatedAt: new Date() };

            if (decryptedBody.google_service_account_email !== undefined) updateData.google_service_account_email = decryptedBody.google_service_account_email;
            if (decryptedBody.google_private_key !== undefined) updateData.google_private_key = decryptedBody.google_private_key;
            if (decryptedBody.google_spreadsheet_id !== undefined) updateData.google_spreadsheet_id = decryptedBody.google_spreadsheet_id;
            if (decryptedBody.status !== undefined) updateData.status = decryptedBody.status;

            await providerDB.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Google Sheet Provider updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[GoogleSheetProviderController:updateProvider] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/delete/:id")
    async deleteProvider(@Param("id") id: string) {
        try {
            const providerDB = new QueryBuilder<GoogleSheetProvider>("google_sheet_providers");

            const existingRecord = await providerDB.findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } });
            if (!existingRecord) {
                throw new HttpError(404, "Google Sheet Provider not found");
            }

            await providerDB.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Google Sheet Provider deleted successfully"
                })
            };
        } catch (error) {
            logger.error(`[GoogleSheetProviderController:deleteProvider] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
