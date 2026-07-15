import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore, Req } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { getFullImageUrl } from "../../utils/mediaUtils";
import { Banner } from "../../models/Banner";

@JsonController("/banners")
@UseBefore(AdminMiddleware)
export class BannerController {

    @Post("/")
    async createBanner(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const bannerDB = new QueryBuilder<Banner>("banners");

            // Convert imageUrl to ObjectId if it's a valid hex string
            let parsedImageUrl: string | ObjectId = decryptedBody.background?.imageUrl;
            if (typeof parsedImageUrl === 'string' && /^[0-9a-fA-F]{24}$/.test(parsedImageUrl)) {
                parsedImageUrl = new ObjectId(parsedImageUrl);
            }

            const newBanner: Banner = {
                internalName: decryptedBody.internalName,
                bgColor: decryptedBody.bgColor,
                background: { imageUrl: parsedImageUrl || null },
                leftContent: decryptedBody.leftContent || { title: 'New Banner' },
                rightCard: decryptedBody.rightCard || { layoutType: 'stacked-cards' },
                isActive: decryptedBody.isActive !== undefined ? decryptedBody.isActive : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await bannerDB.insertOne(newBanner);

            return {
                data: encrypt({
                    success: true,
                    message: "Banner created successfully",
                    bannerId: result.insertedId
                })
            };
        } catch (error) {
            logger.error(`[BannerController:createBanner] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/pagination")
    async listBanners(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const bannerDB = new QueryBuilder<Banner>("banners");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { internalName: { $regex: search, $options: "i" } },
                    { "leftContent.title": { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await bannerDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                success: true,
                ...results,
                data: results.data.map(b => ({ ...b, _id: b._id?.toString() }))
            };
        } catch (error) {
            logger.error(`[BannerController:listBanners] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getBanner(@Param("id") bannerId: string, @Req() req: any) {
        try {
            const bannerDB = new QueryBuilder<Banner>("banners");

            let objId: ObjectId;
            try {
                objId = new ObjectId(bannerId);
            } catch (e) {
                throw new HttpError(400, "Invalid bannerId format");
            }

            const banner = await bannerDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!banner) {
                throw new HttpError(404, "Banner not found");
            }

            const fullImageUrl = await getFullImageUrl(banner.background?.imageUrl, req);

            return {
                data: encrypt({
                    success: true,
                    data: { ...banner, _id: banner._id?.toString(), fullImageUrl }
                })
            };
        } catch (error) {
            logger.error(`[BannerController:getBanner] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateBanner(
        @Param("id") bannerId: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const bannerDB = new QueryBuilder<Banner>("banners");

            let objId: ObjectId;
            try {
                objId = new ObjectId(bannerId);
            } catch (e) {
                throw new HttpError(400, "Invalid bannerId format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            if (updateFields.background && updateFields.background.imageUrl) {
                if (typeof updateFields.background.imageUrl === 'string' && /^[0-9a-fA-F]{24}$/.test(updateFields.background.imageUrl)) {
                    updateFields.background.imageUrl = new ObjectId(updateFields.background.imageUrl);
                }
            }

            const result = await bannerDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Banner not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Banner updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[BannerController:updateBanner] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/delete/:id")
    async deleteBanner(@Param("id") bannerId: string) {
        try {
            const bannerDB = new QueryBuilder<Banner>("banners");

            let objId: ObjectId;
            try {
                objId = new ObjectId(bannerId);
            } catch (e) {
                throw new HttpError(400, "Invalid bannerId format");
            }

            const result = await bannerDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Banner not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Banner deleted successfully"
                })
            };
        } catch (error) {
            logger.error(`[BannerController:deleteBanner] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
