import { JsonController, Get, HttpError, Req, QueryParam, Param } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Course } from "../../models/Course";
import { getFullImageUrl } from "../../utils/mediaUtils";
import { ObjectId } from "mongodb";

@JsonController("/frontend/course")
export class FrontendCourseController {

    // @Get("/")
    // async getCourses(
    //     @Req() req: any,
    //     @QueryParam("page") page: number = 1,
    //     @QueryParam("limit") limit: number = 10
    // ) {
    //     try {
    //         const courseDB = new QueryBuilder<Course>("courses");

    //         const filter = { status: true, isDeleted: { $ne: true } };

    //         const locationDB = new QueryBuilder<any>("locations");
    //         const modeDB = new QueryBuilder<any>("modes");

    //         const paginatedResult = await courseDB.paginate(filter, page, limit);

    //         // Batch fetch related data to optimize performance
    //         const locationIds = new Set<string>();
    //         const modeIds = new Set<string>();
    //         const relatedCourseIds = new Set<string>();

    //         paginatedResult.data.forEach(c => {
    //             if (c.locations) c.locations.forEach(id => locationIds.add(id.toString()));
    //             if (c.modeType) c.modeType.forEach(id => modeIds.add(id.toString()));
    //             if (c.availableCourses) c.availableCourses.forEach(id => relatedCourseIds.add(id.toString()));
    //             if (c.relatedCourses) c.relatedCourses.forEach(id => relatedCourseIds.add(id.toString()));
    //         });

    //         const [locationsList, modesList, relatedCoursesList] = await Promise.all([
    //             locationIds.size > 0 ? locationDB.find({ _id: { $in: Array.from(locationIds).map(id => new ObjectId(id)) } }) : [],
    //             modeIds.size > 0 ? modeDB.find({ _id: { $in: Array.from(modeIds).map(id => new ObjectId(id)) } }) : [],
    //             relatedCourseIds.size > 0 ? courseDB.find({ _id: { $in: Array.from(relatedCourseIds).map(id => new ObjectId(id)) } }) : []
    //         ]);

    //         const locationsMap = new Map(locationsList.map((loc: any) => [loc._id.toString(), loc]));
    //         const modesMap = new Map(modesList.map((mode: any) => [mode._id.toString(), mode]));
    //         const coursesMap = new Map(relatedCoursesList.map((course: any) => [course._id.toString(), course]));

    //         const data = await Promise.all(paginatedResult.data.map(async (c) => {
    //             const mapped: any = {
    //                 ...c,
    //                 _id: c._id?.toString()
    //             };

    //             if (c.image) {
    //                 mapped.image = c.image.toString();
    //                 mapped.fullImageUrl = await getFullImageUrl(c.image, req);
    //             }

    //             if (c.locations && c.locations.length > 0) {
    //                 mapped.locations = c.locations.map(id => locationsMap.get(id.toString())).filter(Boolean);
    //             }

    //             if (c.modeType && c.modeType.length > 0) {
    //                 mapped.modeType = c.modeType.map(id => modesMap.get(id.toString())).filter(Boolean);
    //             }

    //             if (c.availableCourses && c.availableCourses.length > 0) {
    //                 mapped.availableCourses = c.availableCourses.map(id => coursesMap.get(id.toString())).filter(Boolean);
    //             }

    //             if (c.relatedCourses && c.relatedCourses.length > 0) {
    //                 mapped.relatedCourses = c.relatedCourses.map(id => coursesMap.get(id.toString())).filter(Boolean);
    //             }

    //             return mapped;
    //         }));

    //         return {
    //             data: encrypt({
    //                 success: true,
    //                 data: {
    //                     courses: data,
    //                     total: paginatedResult.total,
    //                     page: paginatedResult.page,
    //                     totalPages: paginatedResult.totalPages
    //                 }
    //             })
    //         };
    //     } catch (error) {
    //         logger.error(`[FrontendCourseController:getCourses] Error occurred:`, error);
    //         if (error instanceof HttpError) throw error;
    //         throw new HttpError(500, "Internal server error");
    //     }
    // }

    @Get("/:slug")
    async getCourseBySlug(@Req() req: any, @Param("slug") slug: string) {
        try {
            const courseDB = new QueryBuilder<Course>("courses");
            const filter = { slug };
            console.log("filter", filter);
            console.log(filter);
            const courses = await courseDB.find(filter);
            if (!courses || courses.length === 0) {
                throw new HttpError(404, "Course not found");
            }

            const c = courses[0];
            const mapped: any = {
                ...c,
                _id: c._id?.toString()
            };

            if (c.image) {
                mapped.image = c.image.toString();
                mapped.fullImageUrl = await getFullImageUrl(c.image, req);
            }

            const locationDB = new QueryBuilder<any>("locations");
            const modeDB = new QueryBuilder<any>("modes");
            const subjectDB = new QueryBuilder<any>("subjects");
            const qualificationDB = new QueryBuilder<any>("qualifications");
            const durationDB = new QueryBuilder<any>("durations");
            const fundingDB = new QueryBuilder<any>("fundings");

            const fetchAndMapWithImage = async (db: QueryBuilder<any>, idOrIds: any) => {
                if (!idOrIds) return idOrIds;
                const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
                if (ids.length === 0) return Array.isArray(idOrIds) ? [] : null;

                const objectIds = ids.map((id: any) => {
                    if (typeof id === "string") {
                        try { return new ObjectId(id); } catch (e) { return id; }
                    }
                    return id; // It might already be an ObjectId
                });

                const items = await db.find({ _id: { $in: objectIds } });
                const mappedItems = await Promise.all(items.map(async (item: any) => {
                    const itemMapped = { ...item, _id: item._id?.toString() };
                    if (item.image) {
                        itemMapped.image = item.image.toString();
                        itemMapped.fullImageUrl = await getFullImageUrl(item.image, req);
                    }
                    return itemMapped;
                }));
                return Array.isArray(idOrIds) ? mappedItems : mappedItems[0] || null;
            };

            const anyC = c as any;

            if (anyC.locations && anyC.locations.length > 0) {
                mapped.locations = await fetchAndMapWithImage(locationDB, anyC.locations);
            }

            if (anyC.subject) {
                mapped.subject = await fetchAndMapWithImage(subjectDB, anyC.subject);
            } else if (anyC.subjects && anyC.subjects.length > 0) {
                mapped.subjects = await fetchAndMapWithImage(subjectDB, anyC.subjects);
            }

            if (anyC.qualification) {
                mapped.qualification = await fetchAndMapWithImage(qualificationDB, anyC.qualification);
            } else if (anyC.qualifications && anyC.qualifications.length > 0) {
                mapped.qualifications = await fetchAndMapWithImage(qualificationDB, anyC.qualifications);
            }

            if (anyC.duration) {
                mapped.duration = await fetchAndMapWithImage(durationDB, anyC.duration);
            } else if (anyC.durations && anyC.durations.length > 0) {
                mapped.durations = await fetchAndMapWithImage(durationDB, anyC.durations);
            }

            if (anyC.funding) {
                mapped.funding = await fetchAndMapWithImage(fundingDB, anyC.funding);
            } else if (anyC.fundings && anyC.fundings.length > 0) {
                mapped.fundings = await fetchAndMapWithImage(fundingDB, anyC.fundings);
            }

            if (c.modeType && c.modeType.length > 0) {
                mapped.modeType = await modeDB.find({ _id: { $in: c.modeType } });
            }

            if (c.availableCourses && c.availableCourses.length > 0) {
                const ac = await courseDB.find({ _id: { $in: c.availableCourses } });
                mapped.availableCourses = await Promise.all(ac.map(async (rc: any) => {
                    const rcMapped = { ...rc, _id: rc._id?.toString() };
                    if (rc.image) {
                        rcMapped.image = rc.image.toString();
                        rcMapped.fullImageUrl = await getFullImageUrl(rc.image, req);
                    }
                    return rcMapped;
                }));
            }

            if (c.relatedCourses && c.relatedCourses.length > 0) {
                const rc = await courseDB.find({ _id: { $in: c.relatedCourses } });
                mapped.relatedCourses = await Promise.all(rc.map(async (rcItem: any) => {
                    const rcMapped = { ...rcItem, _id: rcItem._id?.toString() };
                    if (rcItem.image) {
                        rcMapped.image = rcItem.image.toString();
                        rcMapped.fullImageUrl = await getFullImageUrl(rcItem.image, req);
                    }
                    return rcMapped;
                }));
            }
            console.log(mapped);
            return {
                data: encrypt({
                    success: true,
                    data: mapped
                })
            };
        } catch (error) {
            logger.error(`[FrontendCourseController:getCourseBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
