import { JsonController, Post, Get, Body, QueryParams, Req, HttpError } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { Course } from "../../models/Course";
import { Subject } from "../../models/Subject";
import { StudyRoute } from "../../models/StudyRoute";

@JsonController("/frontend/study-filter")
export class FrontendStudyFilterController {

    @Post("/")
    async filterCoursesPost(
        @Req() req: any,
        @Body() body: any
    ) {
        return this.handleFilter(req, body);
    }

    @Get("/")
    async filterCoursesGet(
        @Req() req: any,
        @QueryParams() query: any
    ) {
        return this.handleFilter(req, query);
    }

    private async handleFilter(req: any, rawInput: any) {
        try {
            // Support both encrypted and plain JSON payloads
            let payload = rawInput || {};
            if (rawInput && rawInput.data) {
                try {
                    payload = decrypt(rawInput.data);
                } catch {
                    payload = rawInput;
                }
            }

            const safeObjectId = (val: any): ObjectId | null => {
                if (!val) return null;
                if (val instanceof ObjectId) return val;
                if (typeof val === "string") {
                    const clean = val.trim();
                    if (/^[0-9a-fA-F]{24}$/.test(clean)) {
                        return new ObjectId(clean);
                    }
                }
                return null;
            };

            const courseDB = new QueryBuilder<Course>("courses");
            const subjectDB = new QueryBuilder<Subject>("subjects");
            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            const target = (payload.requireCollection || "").toLowerCase().trim();
            const isRoute = target === "routes" || target === "route";

            // Build filter for courses
            const courseFilter: any = { status: { $ne: false }, isDeleted: { $ne: true } };
            let hasCourseFilters = false;

            if (payload.subject && payload.subject !== "Any subject") {
                const id = safeObjectId(payload.subject);
                if (id) {
                    courseFilter.$or = [{ subjects: id }, { subject: id }];
                    hasCourseFilters = true;
                }
            }

            if (payload.qualification && payload.qualification !== "Any qualification") {
                const id = safeObjectId(payload.qualification);
                if (id) {
                    courseFilter.qualifications = id;
                    hasCourseFilters = true;
                }
            }

            if (payload.mode && payload.mode !== "Any mode") {
                const id = safeObjectId(payload.mode);
                if (id) {
                    courseFilter.modeType = id;
                    hasCourseFilters = true;
                }
            }

            if (payload.location && payload.location !== "Any location") {
                const id = safeObjectId(payload.location);
                if (id) {
                    courseFilter.locations = id;
                    hasCourseFilters = true;
                }
            }

            if (payload.duration && payload.duration !== "Any duration") {
                const id = safeObjectId(payload.duration);
                if (id) {
                    courseFilter.durations = id;
                    hasCourseFilters = true;
                }
            }

            if (payload.route && payload.route !== "Any route") {
                const id = safeObjectId(payload.route);
                if (id) {
                    courseFilter.routes = id;
                    hasCourseFilters = true;
                }
            }

            if (payload.funding && payload.funding !== "Any funding") {
                const id = safeObjectId(payload.funding);
                if (id) {
                    courseFilter.fundings = id;
                    hasCourseFilters = true;
                }
            }

            // Keyword filter applies to subject and route (title and description)
            const keyword = (payload.keyword || payload.keyword_search || "").trim();

            let data: any[] = [];

            if (isRoute) {
                // Route page -> return study routes
                const routeQuery: any = { status: { $ne: false }, isDeleted: { $ne: true } };

                if (hasCourseFilters) {
                    const courses = await courseDB.find(courseFilter, { projection: { routes: 1 } });
                    const routeIds = new Set<string>();
                    courses.forEach((c: any) => {
                        if (c.routes && Array.isArray(c.routes)) {
                            c.routes.forEach((id: any) => routeIds.add(id.toString()));
                        }
                    });

                    if (routeIds.size === 0) {
                        return {
                            data: encrypt({
                                success: true,
                                data: []
                            })
                        };
                    }

                    routeQuery._id = { $in: Array.from(routeIds).map(id => new ObjectId(id)) };
                }

                if (keyword) {
                    const kwRegex = { $regex: keyword, $options: "i" };
                    routeQuery.$or = [
                        { title: kwRegex },
                        { description: kwRegex }
                    ];
                }

                const routes = await studyRouteDB.find(routeQuery);
                data = routes.map(r => ({
                    _id: r._id?.toString(),
                    title: r.title,
                    description: r.description,
                    slug: r.slug,
                    link: r.link
                }));
            } else {
                // Subject page -> return subjects
                const subjectQuery: any = { status: { $ne: false }, isDeleted: { $ne: true } };

                if (hasCourseFilters) {
                    const courses = await courseDB.find(courseFilter, { projection: { subjects: 1, subject: 1 } });
                    const subjectIds = new Set<string>();
                    courses.forEach((c: any) => {
                        if (c.subjects && Array.isArray(c.subjects)) {
                            c.subjects.forEach((id: any) => subjectIds.add(id.toString()));
                        }
                        if (c.subject) {
                            if (Array.isArray(c.subject)) {
                                c.subject.forEach((id: any) => subjectIds.add(id.toString()));
                            } else {
                                subjectIds.add(c.subject.toString());
                            }
                        }
                    });

                    if (subjectIds.size === 0) {
                        return {
                            data: encrypt({
                                success: true,
                                data: []
                            })
                        };
                    }

                    subjectQuery._id = { $in: Array.from(subjectIds).map(id => new ObjectId(id)) };
                }

                if (keyword) {
                    const kwRegex = { $regex: keyword, $options: "i" };
                    subjectQuery.$or = [
                        { title: kwRegex },
                        { description: kwRegex }
                    ];
                }

                const subjects = await subjectDB.find(subjectQuery);
                data = subjects.map((s) => {
                    const slugVal = s.slug || s.title?.toLowerCase()?.trim().replace(/\s+/g, "-") || "";
                    return {
                        _id: s._id?.toString(),
                        title: s.title,
                        description: s.description || "",
                        link: `/degrees/${slugVal.replace(/^\//, "")}`
                    };
                });
            }

            return {
                data: encrypt({
                    success: true,
                    data
                })
            };
        } catch (error) {
            logger.error(`[FrontendStudyFilterController:handleFilter] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
