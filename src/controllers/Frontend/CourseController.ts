import { JsonController, Get, HttpError, Req, QueryParam, Param } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Course } from "../../models/Course";
import { getFullImageUrl } from "../../utils/mediaUtils";
import { ObjectId } from "mongodb";

@JsonController("/frontend/course")
export class FrontendCourseController {

    @Get("/allcourses")
    async getCourses(
        @Req() req: any,
        @QueryParam("pageSize") pageSize?: number
    ) {
        try {
            const courseDB = new QueryBuilder<Course>("courses");
            const filter = { status: true, isDeleted: { $ne: true } };
            const options: any = {};
            if (pageSize && !isNaN(pageSize)) {
                options.limit = Number(pageSize);
            }
            const allCourses = await courseDB.find(filter, options);

            const locationDB = new QueryBuilder<any>("locations");
            const subjectDB = new QueryBuilder<any>("subjects");
            const modeDB = new QueryBuilder<any>("modes");
            const qualificationDB = new QueryBuilder<any>("qualifications");
            const durationDB = new QueryBuilder<any>("durations");
            const fundingDB = new QueryBuilder<any>("fundings");

            const locationIds = new Set<string>();
            const subjectIds = new Set<string>();
            const modeIds = new Set<string>();
            const qualificationIds = new Set<string>();
            const durationIds = new Set<string>();
            const fundingIds = new Set<string>();

            allCourses.forEach((c: any) => {
                if (c.locations) c.locations.forEach((id: any) => locationIds.add(id.toString()));
                if (c.subject) {
                    if (Array.isArray(c.subject)) {
                        c.subject.forEach((id: any) => subjectIds.add(id.toString()));
                    } else {
                        subjectIds.add(c.subject.toString());
                    }
                }
                if (c.subjects) c.subjects.forEach((id: any) => subjectIds.add(id.toString()));

                if (c.modeType) c.modeType.forEach((id: any) => modeIds.add(id.toString()));

                if (c.qualification) {
                    if (Array.isArray(c.qualification)) {
                        c.qualification.forEach((id: any) => qualificationIds.add(id.toString()));
                    } else {
                        qualificationIds.add(c.qualification.toString());
                    }
                }
                if (c.qualifications) c.qualifications.forEach((id: any) => qualificationIds.add(id.toString()));

                if (c.duration) {
                    if (Array.isArray(c.duration)) {
                        c.duration.forEach((id: any) => durationIds.add(id.toString()));
                    } else {
                        durationIds.add(c.duration.toString());
                    }
                }
                if (c.durations) c.durations.forEach((id: any) => durationIds.add(id.toString()));

                if (c.funding) {
                    if (Array.isArray(c.funding)) {
                        c.funding.forEach((id: any) => fundingIds.add(id.toString()));
                    } else {
                        fundingIds.add(c.funding.toString());
                    }
                }
                if (c.fundings) c.fundings.forEach((id: any) => fundingIds.add(id.toString()));
            });

            const [
                locationsList,
                subjectsList,
                modesList,
                qualificationsList,
                durationsList,
                fundingsList
            ] = await Promise.all([
                locationIds.size > 0 ? locationDB.find({ _id: { $in: Array.from(locationIds).map(id => new ObjectId(id)) } }) : [],
                subjectIds.size > 0 ? subjectDB.find({ _id: { $in: Array.from(subjectIds).map(id => new ObjectId(id)) } }) : [],
                modeIds.size > 0 ? modeDB.find({ _id: { $in: Array.from(modeIds).map(id => new ObjectId(id)) } }) : [],
                qualificationIds.size > 0 ? qualificationDB.find({ _id: { $in: Array.from(qualificationIds).map(id => new ObjectId(id)) } }) : [],
                durationIds.size > 0 ? durationDB.find({ _id: { $in: Array.from(durationIds).map(id => new ObjectId(id)) } }) : [],
                fundingIds.size > 0 ? fundingDB.find({ _id: { $in: Array.from(fundingIds).map(id => new ObjectId(id)) } }) : []
            ]);

            const mapListWithImage = async (list: any[]) => {
                return await Promise.all(list.map(async (item: any) => {
                    const itemMapped = { ...item, _id: item._id?.toString() };
                    if (item.image) {
                        itemMapped.image = item.image.toString();
                        itemMapped.fullImageUrl = await getFullImageUrl(item.image, req);
                    }
                    return itemMapped;
                }));
            };

            const [
                mappedLocations,
                mappedSubjects,
                mappedModes,
                mappedQualifications,
                mappedDurations,
                mappedFundings
            ] = await Promise.all([
                mapListWithImage(locationsList),
                mapListWithImage(subjectsList),
                mapListWithImage(modesList),
                mapListWithImage(qualificationsList),
                mapListWithImage(durationsList),
                mapListWithImage(fundingsList)
            ]);

            const locationsMap = new Map(mappedLocations.map((loc: any) => [loc._id.toString(), loc]));
            const subjectsMap = new Map(mappedSubjects.map((sub: any) => [sub._id.toString(), sub]));
            const modesMap = new Map(mappedModes.map((m: any) => [m._id.toString(), m]));
            const qualificationsMap = new Map(mappedQualifications.map((q: any) => [q._id.toString(), q]));
            const durationsMap = new Map(mappedDurations.map((d: any) => [d._id.toString(), d]));
            const fundingsMap = new Map(mappedFundings.map((f: any) => [f._id.toString(), f]));

            const data = await Promise.all(allCourses.map(async (c: any) => {
                const mapped: any = {
                    ...c,
                    _id: c._id?.toString()
                };

                delete mapped.availableCourses;
                delete mapped.relatedCourses;

                if (c.image) {
                    mapped.image = c.image.toString();
                    mapped.fullImageUrl = await getFullImageUrl(c.image, req);
                }

                if (c.locations && c.locations.length > 0) {
                    mapped.locations = c.locations.map((id: any) => locationsMap.get(id.toString())).filter(Boolean);
                }

                if (c.subject) {
                    if (Array.isArray(c.subject)) {
                        mapped.subject = c.subject.map((id: any) => subjectsMap.get(id.toString())).filter(Boolean);
                    } else {
                        mapped.subject = subjectsMap.get(c.subject.toString()) || null;
                    }
                } else if (c.subjects && c.subjects.length > 0) {
                    mapped.subjects = c.subjects.map((id: any) => subjectsMap.get(id.toString())).filter(Boolean);
                }

                if (c.modeType && c.modeType.length > 0) {
                    mapped.modeType = c.modeType.map((id: any) => modesMap.get(id.toString())).filter(Boolean);
                }

                if (c.qualification) {
                    if (Array.isArray(c.qualification)) {
                        mapped.qualification = c.qualification.map((id: any) => qualificationsMap.get(id.toString())).filter(Boolean);
                    } else {
                        mapped.qualification = qualificationsMap.get(c.qualification.toString()) || null;
                    }
                } else if (c.qualifications && c.qualifications.length > 0) {
                    mapped.qualifications = c.qualifications.map((id: any) => qualificationsMap.get(id.toString())).filter(Boolean);
                }

                if (c.duration) {
                    if (Array.isArray(c.duration)) {
                        mapped.duration = c.duration.map((id: any) => durationsMap.get(id.toString())).filter(Boolean);
                    } else {
                        mapped.duration = durationsMap.get(c.duration.toString()) || null;
                    }
                } else if (c.durations && c.durations.length > 0) {
                    mapped.durations = c.durations.map((id: any) => durationsMap.get(id.toString())).filter(Boolean);
                }

                if (c.funding) {
                    if (Array.isArray(c.funding)) {
                        mapped.funding = c.funding.map((id: any) => fundingsMap.get(id.toString())).filter(Boolean);
                    } else {
                        mapped.funding = fundingsMap.get(c.funding.toString()) || null;
                    }
                } else if (c.fundings && c.fundings.length > 0) {
                    mapped.fundings = c.fundings.map((id: any) => fundingsMap.get(id.toString())).filter(Boolean);
                }

                return mapped;
            }));

            return {
                data: encrypt({
                    success: true,
                    data: {
                        courses: data
                    }
                })
            };
        } catch (error) {
            logger.error(`[FrontendCourseController:getCourses] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

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

            const courseCmsDB = new QueryBuilder<any>("course_cms");
            if (c._id) {
                const courseCms = await courseCmsDB.findOne({ courseId: c._id, isDeleted: { $ne: true } });
                if (courseCms) {
                    delete courseCms._id;
                    delete courseCms.courseId;
                    delete courseCms.isDeleted;
                    delete courseCms.createdAt;
                    delete courseCms.updatedAt;

                    if (courseCms.section_10 && courseCms.section_10.featured_course) {
                        let featuredId = courseCms.section_10.featured_course;
                        try {
                            if (typeof featuredId === 'string') {
                                featuredId = new ObjectId(featuredId);
                            }
                            const fc = await courseDB.findOne({ _id: featuredId });
                            if (fc) {
                                const fcMapped: any = { ...fc, _id: fc._id?.toString() };
                                if (fc.image) {
                                    fcMapped.image = fc.image.toString();
                                    fcMapped.fullImageUrl = await getFullImageUrl(fc.image, req);
                                }
                                courseCms.section_10.featured_course = fcMapped;
                            } else {
                                courseCms.section_10.featured_course = null;
                            }
                        } catch (err) {
                            courseCms.section_10.featured_course = null;
                        }
                    }

                    mapped.courseCms = courseCms;
                }
            }

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
