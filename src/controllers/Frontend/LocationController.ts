import { JsonController, Get, HttpError, Req, Param } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Location } from "../../models/Location";
import { Course } from "../../models/Course";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/locations")
export class FrontendLocationController {

    @Get("/")
    async getAllLocations(
        @Req() req: any
    ) {
        try {
            const locationDB = new QueryBuilder<Location>("locations");

            const locations = await locationDB.find({ status: { $ne: false }, isDeleted: { $ne: true } });

            const data = await Promise.all(locations.map(async (loc) => {
                const mapped: any = {
                    _id: loc._id?.toString(),
                    title: loc.title,
                    slug: loc.slug,
                    short_description: loc.short_description,
                    long_description: loc.long_description,
                    badge: loc.badge,
                    tags: loc.tags
                };

                if (loc.image) {
                    mapped.image = loc.image.toString();
                    mapped.fullImageUrl = await getFullImageUrl(loc.image, req);
                }

                return mapped;
            }));

            return {
                data: encrypt({
                    success: true,
                    data
                })
            };
        } catch (error) {
            logger.error(`[FrontendLocationController:getAllLocations] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/courses/:locationId")
    async getCoursesByLocationId(
        @Param("locationId") locationId: string,
        @Req() req: any
    ) {
        try {
            if (!locationId || locationId.trim() === "") {
                return {
                    data: encrypt({
                        success: true,
                        data: []
                    })
                };
            }

            const locationDB = new QueryBuilder<Location>("locations");
            const courseDB = new QueryBuilder<Course>("courses");

            const cleanId = locationId.trim();
            const escaped = cleanId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            let location: Location | null = null;
            if (ObjectId.isValid(cleanId) && cleanId.length === 24) {
                location = await locationDB.findOne({
                    _id: new ObjectId(cleanId),
                    isDeleted: { $ne: true }
                });
            }

            if (!location) {
                location = await locationDB.findOne({
                    slug: { $regex: new RegExp(`^${escaped}$`, "i") },
                    isDeleted: { $ne: true }
                });
            }

            if (!location) {
                location = await locationDB.findOne({
                    title: { $regex: new RegExp(`^${escaped}$`, "i") },
                    isDeleted: { $ne: true }
                });
            }

            if (!location) {
                location = await locationDB.findOne({
                    title: { $regex: new RegExp(escaped, "i") },
                    isDeleted: { $ne: true }
                });
            }

            const orConditions: any[] = [];

            if (location) {
                if (location._id) {
                    orConditions.push({ locations: location._id });
                    orConditions.push({ locations: location._id.toString() });
                }
                if (location.slug) {
                    orConditions.push({ locations: location.slug });
                }
                if (location.title) {
                    orConditions.push({ locations: location.title });
                    orConditions.push({ locations: { $regex: new RegExp(location.title, "i") } });
                }
            }

            if (ObjectId.isValid(cleanId) && cleanId.length === 24) {
                orConditions.push({ locations: new ObjectId(cleanId) });
                orConditions.push({ locations: cleanId });
            }
            orConditions.push({ locations: cleanId });
            orConditions.push({ locations: { $regex: new RegExp(escaped, "i") } });

            const courseFilter: any = {
                $or: orConditions,
                status: true,
                isDeleted: { $ne: true }
            };

            const courses = await courseDB.find(courseFilter);
            const locationName = location?.title || cleanId;

            const data = await Promise.all(courses.map(async (c: any) => {
                const fullImageUrl = c.image ? await getFullImageUrl(c.image, req) : null;
                const badge = (c.badges && Array.isArray(c.badges) && c.badges.length > 0)
                    ? c.badges[0]
                    : (c.badge || "");

                return {
                    _id: c._id?.toString(),
                    badge,
                    badges: c.badges || (badge ? [badge] : []),
                    slug: c.slug,
                    title: c.title,
                    shortDescription: c.shortDescription || "",
                    longDescription: c.longDescription || "",
                    image: c.image ? c.image.toString() : null,
                    location: locationName,
                    locations: [locationName],
                    entryRequirement: c.entryRequirement || c.entryRequirements || [],
                    salaryRange: c.salaryRange || null,
                    careerOutcomeBadge: c.careerOutcomeBadge || null,
                    fullImageUrl
                };
            }));

            return {
                data: encrypt({
                    success: true,
                    data
                })
            };
        } catch (error) {
            logger.error(`[FrontendLocationController:getCoursesByLocationId] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}

// Alias for singular /frontend/location
@JsonController("/frontend/location")
export class FrontendSingleLocationController extends FrontendLocationController {}
