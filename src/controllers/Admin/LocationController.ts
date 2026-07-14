import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Req, Delete } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { Location } from "../../models/Location";
import { getFullImageUrl } from "../../utils/mediaUtils";


@JsonController("/location")
@UseBefore(AdminMiddleware)
export class LocationController {

    @Post("/add")
    async addLocation(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.slug) {
                throw new HttpError(400, "Slug is required and cannot be empty");
            }
            if (!decryptedBody.title) {
                throw new HttpError(400, "Title is required and cannot be empty");
            }

            const locationDB = new QueryBuilder<Location>("locations");

            // Check if slug already exists
            const existingLocation = await locationDB.findOne({ slug: decryptedBody.slug, isDeleted: { $ne: true } });
            if (existingLocation) {
                throw new HttpError(400, "Location with this slug already exists");
            }

            // Construct new location object
            const newLocation: Location = {
                title: decryptedBody.title,
                slug: decryptedBody.slug,
                short_description: decryptedBody.short_description,
                long_description: decryptedBody.long_description,
                badge: decryptedBody.badge,
                description: decryptedBody.description,
                tags: Array.isArray(decryptedBody.tags) ? decryptedBody.tags : [],
                image: decryptedBody.image ? new ObjectId(decryptedBody.image) : null,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await locationDB.insertOne(newLocation);

            return {
                data: encrypt({
                    success: true,
                    message: "Location added successfully",
                    locationId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[LocationController:addLocation] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listLocations(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10
    ) {
        try {
            const locationDB = new QueryBuilder<Location>("locations");

            const results = await locationDB.paginate({ isDeleted: { $ne: true } }, Number(page), Number(limit), { createdAt: -1 });

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(l => ({
                        _id: l._id?.toString(),
                        title: l.title,
                        slug: l.slug,
                        status: l.status,
                        createdAt: l.createdAt,
                        updatedAt: l.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[LocationController:listLocations] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllLocations() {
        try {
            const locationDB = new QueryBuilder<Location>("locations");

            const locations = await locationDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1,
                    slug: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: locations.map((l: any) => ({
                        _id: l._id?.toString(),
                        title: l.title,
                        slug: l.slug,
                        status: l.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[LocationController:getAllLocations] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getLocationById(@Param("id") id: string, @Req() req: any) {
        try {
            const locationDB = new QueryBuilder<Location>("locations");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid location ID format");
            }

            const location = await locationDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!location) {
                throw new HttpError(404, "Location not found");
            }

            const fullImageUrl = await getFullImageUrl(location.image, req);

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...location,
                        _id: location._id?.toString(),
                        fullImageUrl
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[LocationController:getLocationById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateLocation(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const locationDB = new QueryBuilder<Location>("locations");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid location ID format");
            }

            if (decryptedBody.slug) {
                const existingLocation = await locationDB.findOne({ slug: decryptedBody.slug, isDeleted: { $ne: true } });
                if (existingLocation && existingLocation._id?.toString() !== id) {
                    throw new HttpError(400, "Location with this slug already exists");
                }
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            if (updateFields.image) {
                updateFields.image = new ObjectId(updateFields.image);
            }

            const result = await locationDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Location not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Location updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[LocationController:updateLocation] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteLocation(@Param("id") id: string) {
        try {
            const locationDB = new QueryBuilder<Location>("locations");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid location ID format");
            }

            const result = await locationDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Location not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Location deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[LocationController:deleteLocation] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
