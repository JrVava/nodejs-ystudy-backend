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

    private async fetchAndMapWithImage(db: any, idOrIds: any, req: any) {
        if (!idOrIds) return idOrIds;
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        if (ids.length === 0) return Array.isArray(idOrIds) ? [] : null;

        const objectIds = ids.map((id: any) => {
            if (typeof id === "string") {
                try { return new ObjectId(id); } catch (e) { return id; }
            }
            return id;
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
    }

    private async processGeneralCourse(c: any, req: any): Promise<any> {
        const mapped: any = { ...c, _id: c._id?.toString() };
        if (c.image) {
            mapped.image = c.image.toString();
            mapped.fullImageUrl = await getFullImageUrl(c.image, req);
        }

        const locationDB = new QueryBuilder("locations");
        const modeDB = new QueryBuilder("modes");
        const subjectDB = new QueryBuilder("subjects");
        const qualificationDB = new QueryBuilder("qualifications");
        const durationDB = new QueryBuilder("durations");
        const fundingDB = new QueryBuilder("fundings");
        const courseDB = new QueryBuilder("courses");

        const anyC = c as any;
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
                    rcMapped.locations = await this.fetchAndMapWithImage(locationDB, rcMapped.locations, req);
                }
                if (rcMapped.subject) {
                    rcMapped.subject = await this.fetchAndMapWithImage(subjectDB, rcMapped.subject, req);
                } else if (rcMapped.subjects && rcMapped.subjects.length > 0) {
                    rcMapped.subjects = await this.fetchAndMapWithImage(subjectDB, rcMapped.subjects, req);
                }

                return rcMapped;
            }));
        }

        const courseCmsDB = new QueryBuilder("course_cms");
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

                if (courseCms.section_2) {
                    const ac = await this.fetchAndMapWithImage(courseDB, c.availableCourses, req);
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
                                item.locations = await this.fetchAndMapWithImage(locationDB, item.locations, req);
                            }
                            if (item.subject) {
                                item.subject = await this.fetchAndMapWithImage(subjectDB, item.subject, req);
                            } else if (item.subjects && item.subjects.length > 0) {
                                item.subjects = await this.fetchAndMapWithImage(subjectDB, item.subjects, req);
                            }

                            return item;
                        }));
                    }
                }

                if (courseCms.section_7) {
                    courseCms.section_7.subject = await this.fetchAndMapWithImage(subjectDB, anyC.subject || anyC.subjects, req);
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
                mapped.courseCms = courseCms;
            }
        }

        delete mapped.subject;
        delete mapped.subjects;
        delete mapped.availableCourses;
        delete mapped.locations;
        delete mapped.modeType;
        delete mapped.durations;
        delete mapped.fundings;
        delete mapped.qualifications;
        delete mapped.duration;
        delete mapped.funding;
        delete mapped.qualification;

        return mapped;
    }

    private async processSocialCourse(c: any, req: any, slug: string): Promise<any> {
        const mapped: any = { ...c, _id: c._id?.toString() };
        if (c.image) {
            mapped.image = c.image.toString();
            mapped.fullImageUrl = await getFullImageUrl(c.image, req);
        }

        const timeTableDB = new QueryBuilder("time_tables");
        const timeTableData = await timeTableDB.find({ slug: slug, isDeleted: { $ne: true } });

        const studentStoriesDB = new QueryBuilder("student_stories");
        const studentStoriesData = await studentStoriesDB.find({ isDeleted: { $ne: true } });

        const upcomingIntakesDB = new QueryBuilder("upcoming_intakes");
        const upcomingIntakesData = await upcomingIntakesDB.find({ isDeleted: { $ne: true } });

        const subjectsDB = new QueryBuilder("subjects");
        const subjectsData = await subjectsDB.find({ slug: slug, isDeleted: { $ne: true } });

        const faqDB = new QueryBuilder("faqs");
        const faqData = await faqDB.find({ slug: slug, isDeleted: { $ne: true } });

        const courseCmsDB = new QueryBuilder("course_cms");
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

                if (timeTableData && timeTableData.length > 0) {
                    if (!courseCms.study) courseCms.study = {};
                    if (!courseCms.study.section_2) courseCms.study.section_2 = {};
                    courseCms.study.section_2.timeTable = timeTableData;
                }
                if (studentStoriesData && studentStoriesData.length > 0) {
                    if (!courseCms.reviews) courseCms.reviews = {};
                    courseCms.reviews.studentStories = studentStoriesData;
                }
                if (upcomingIntakesData && upcomingIntakesData.length > 0) {
                    if (!courseCms.Entry) courseCms.Entry = {};
                    if (!courseCms.Entry.section_2) courseCms.Entry.section_2 = {};
                    courseCms.Entry.section_2.upcomingIntakes = upcomingIntakesData;
                }
                if (subjectsData && subjectsData.length > 0) {
                    if (!courseCms.Entry) courseCms.Entry = {};
                    if (!courseCms.Entry.section_5) courseCms.Entry.section_5 = {};
                    courseCms.Entry.section_5.subjects = subjectsData;
                }
                if (faqData && faqData.length > 0) {
                    if (!courseCms.FAQ) courseCms.FAQ = {};
                    if (!courseCms.FAQ.section_1) courseCms.FAQ.section_1 = {};
                    courseCms.FAQ.section_1.faq = faqData;
                }

                mapped.courseCms = courseCms;
            }
        }

        delete mapped.relatedCourses;
        delete mapped.locations;
        delete mapped.modeType;
        delete mapped.durations;
        delete mapped.fundings;
        delete mapped.qualifications;
        delete mapped.subject;
        delete mapped.duration;
        delete mapped.funding;
        delete mapped.qualification;
        delete mapped.subjects;
        delete mapped.availableCourses;

        return mapped;
    }

    @Get("/:slug")
    async getCourseBySlug(@Req() req: any, @Param("slug") slug: string) {
        try {
            const courseDB = new QueryBuilder<Course>("courses");
            const filter = { slug };
            const course = await courseDB.findOne(filter);
            if (!course) {
                throw new HttpError(404, "Course not found");
            }

            let mapped: any;
            if (course.courseType === 'Social') {
                mapped = await this.processSocialCourse(course, req, slug);
            } else if (course.courseType === "General") {
                mapped = await this.processGeneralCourse(course, req);
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
