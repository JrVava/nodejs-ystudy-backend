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
        @Req() req: any
    ) {
        try {
            const courseDB = new QueryBuilder<Course>("courses");
            const filter = { status: true, isDeleted: { $ne: true } };
            const allCourses = await courseDB.find(filter);

            const locationDB = new QueryBuilder<any>("locations");
            const subjectDB = new QueryBuilder<any>("subjects");

            const locationIds = new Set<string>();
            const subjectIds = new Set<string>();

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
            });

            const [locationsList, subjectsList] = await Promise.all([
                locationIds.size > 0 ? locationDB.find({ _id: { $in: Array.from(locationIds).map(id => new ObjectId(id)) } }) : [],
                subjectIds.size > 0 ? subjectDB.find({ _id: { $in: Array.from(subjectIds).map(id => new ObjectId(id)) } }) : []
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

            const mappedLocations = await mapListWithImage(locationsList);
            const mappedSubjects = await mapListWithImage(subjectsList);

            const locationsMap = new Map(mappedLocations.map((loc: any) => [loc._id.toString(), loc]));
            const subjectsMap = new Map(mappedSubjects.map((sub: any) => [sub._id.toString(), sub]));

            const data = await Promise.all(allCourses.map(async (c: any) => {
                const mapped: any = {
                    ...c,
                    _id: c._id?.toString()
                };

                delete mapped.availableCourses;
                delete mapped.relatedCourses;
                delete mapped.durations;
                delete mapped.fundings;
                delete mapped.qualifications;
                delete mapped.modeType;
                delete mapped.qualification;
                delete mapped.duration;
                delete mapped.funding;

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

            // availableCourses are fetched in courseCms.section_2, so we skip fetching them here.

            if (c.relatedCourses && c.relatedCourses.length > 0) {
                const rc = await courseDB.find({ _id: { $in: c.relatedCourses } });
                mapped.relatedCourses = await Promise.all(rc.map(async (rcItem: any) => {
                    const rcMapped = { ...rcItem, _id: rcItem._id?.toString() };
                    if (rcItem.image) {
                        rcMapped.image = rcItem.image.toString();
                        rcMapped.fullImageUrl = await getFullImageUrl(rcItem.image, req);
                    }
                    
                    delete rcMapped.availableCourses;
                    delete rcMapped.relatedCourses;
                    delete rcMapped.modeType;
                    delete rcMapped.durations;
                    delete rcMapped.fundings;
                    delete rcMapped.qualifications;

                    if (rcMapped.locations && rcMapped.locations.length > 0) {
                        rcMapped.locations = await fetchAndMapWithImage(locationDB, rcMapped.locations);
                    }
                    if (rcMapped.subject) {
                        rcMapped.subject = await fetchAndMapWithImage(subjectDB, rcMapped.subject);
                    } else if (rcMapped.subjects && rcMapped.subjects.length > 0) {
                        rcMapped.subjects = await fetchAndMapWithImage(subjectDB, rcMapped.subjects);
                    }
                    
                    return rcMapped;
                }));
            }

            const courseCmsDB = new QueryBuilder<any>("course_cms");
            mapped.courseCms = {};
            if (c._id) {
                const courseCms = await courseCmsDB.findOne({ courseId: c._id, isDeleted: { $ne: true } });
                if (courseCms) {
                    delete courseCms._id;
                    delete courseCms.courseId;
                    delete courseCms.isDeleted;
                    delete courseCms.createdAt;
                    delete courseCms.updatedAt;

                    for (const key of Object.keys(courseCms)) {
                        if (key.startsWith('section_') && courseCms[key]) {
                            if (courseCms[key].status === false) {
                                delete courseCms[key];
                            }
                        }
                    }

                    if (c.courseType === 'General') {
                        if (courseCms.section_2) {
                            const ac = await fetchAndMapWithImage(courseDB, c.availableCourses);
                            if (ac) {
                                const acArray = Array.isArray(ac) ? ac : [ac];
                                courseCms.section_2.availableCourses = await Promise.all(acArray.map(async (item: any) => {
                                    delete item.availableCourses;
                                    delete item.relatedCourses;
                                    delete item.modeType;
                                    delete item.durations;
                                    delete item.fundings;
                                    delete item.qualifications;
                                    
                                    if (item.locations && item.locations.length > 0) {
                                        item.locations = await fetchAndMapWithImage(locationDB, item.locations);
                                    }
                                    if (item.subject) {
                                        item.subject = await fetchAndMapWithImage(subjectDB, item.subject);
                                    } else if (item.subjects && item.subjects.length > 0) {
                                        item.subjects = await fetchAndMapWithImage(subjectDB, item.subjects);
                                    }
                                    
                                    return item;
                                }));
                            }
                        }

                        if (courseCms.section_7) {
                            courseCms.section_7.subject = await fetchAndMapWithImage(subjectDB, (c as any).subject || c.subjects);
                        }

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
                    }

                    mapped.courseCms = courseCms;
                }
            }

            delete mapped.availableCourses;

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
