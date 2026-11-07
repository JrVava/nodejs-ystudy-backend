import { JsonController, Post, Body, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { Course } from "../../models/Course";
import { Subject } from "../../models/Subject";
import { Tool } from "../../models/Tool";
import { CourseCms } from "../../models/CourseCms";
import { SubjectCms } from "../../models/SubjectCms";

// Helper to escape regex special characters safely
function escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export interface SearchResultItem {
    module: "Course" | "Subject" | "Tools";
    title: string;
    description: string;
    link: string;
}

@JsonController("/frontend/search")
export class FrontendSearchController {

    @Post("/")
    async search(
        @Body() body: any
    ) {
        try {
            // Support both encrypted and plain payloads
            let payload = body;
            if (body && body.data) {
                try {
                    payload = decrypt(body.data);
                } catch (e) {
                    payload = body;
                }
            }

            const rawQuery = (payload?.search || "").trim();
            const targetType = (payload?.type || "all").toLowerCase();

            const courseDB = new QueryBuilder<Course>("courses");
            const subjectDB = new QueryBuilder<Subject>("subjects");
            const toolDB = new QueryBuilder<Tool>("tools");
            const courseCmsDB = new QueryBuilder<CourseCms>("course_cms");
            const subjectCmsDB = new QueryBuilder<SubjectCms>("subjectCMS");

            const searchCourses = targetType === "all" || targetType === "course" || targetType === "courses";
            const searchSubjects = targetType === "all" || targetType === "subject" || targetType === "subjects";
            const searchTools = targetType === "all" || targetType === "tool" || targetType === "tools";

            let coursesResult: SearchResultItem[] = [];
            let subjectsResult: SearchResultItem[] = [];
            let toolsResult: SearchResultItem[] = [];

            // Case 1: Search is empty -> Default to get all courses; subjects & tools are empty arrays
            if (!rawQuery) {
                if (searchCourses) {
                    const courses = await courseDB.find(
                        { status: true, isDeleted: { $ne: true } },
                        { sort: { createdAt: -1 } }
                    );

                    coursesResult = courses.map((c) => ({
                        module: "Course",
                        title: c.title,
                        description: c.shortDescription || c.longDescription || "",
                        link: c.slug ? `degrees/course/${c.slug}` : ""
                    }));
                }
                subjectsResult = [];
                toolsResult = [];
            } else {
                // Case 2: Search is not empty -> Filter courses, subjects and tools using search & CMS values
                const regexQuery = { $regex: escapeRegex(rawQuery), $options: "i" };

                // 1. Search Courses & Course CMS values
                if (searchCourses) {
                    // Search in Course CMS values across sections
                    const courseCmsOrConditions: any[] = [
                        { "section_2.title": regexQuery },
                        { "section_2.description": regexQuery },
                        { "section_2.badge": regexQuery },
                        { "section_3.title": regexQuery },
                        { "section_3.description": regexQuery },
                        { "section_3.badge": regexQuery },
                        { "section_3.cards.title": regexQuery },
                        { "section_3.cards.description": regexQuery },
                        { "section_4.title": regexQuery },
                        { "section_4.badge": regexQuery },
                        { "section_4.cards.title": regexQuery },
                        { "section_4.cards.description": regexQuery },
                        { "section_5.title": regexQuery },
                        { "section_5.description": regexQuery },
                        { "section_5.badge": regexQuery },
                        { "section_5.cards.title": regexQuery },
                        { "section_5.cards.description": regexQuery },
                        { "section_5.cards.badge": regexQuery },
                        { "section_5.cards.salary": regexQuery },
                        { "section_6.title": regexQuery },
                        { "section_6.description": regexQuery },
                        { "section_6.badge": regexQuery },
                        { "section_6.cards.title": regexQuery },
                        { "section_6.cards.description": regexQuery },
                        { "section_7.title": regexQuery },
                        { "section_7.description": regexQuery },
                        { "section_7.badge": regexQuery },
                        { "section_8.title": regexQuery },
                        { "section_8.badge": regexQuery },
                        { "section_8.cards.title": regexQuery },
                        { "section_8.cards.description": regexQuery },
                        { "section_9.title": regexQuery },
                        { "section_9.description": regexQuery },
                        { "section_9.badge": regexQuery },
                        { "section_9.cards.title": regexQuery },
                        { "section_9.cards.description": regexQuery },
                        { "section_10.title": regexQuery },
                        { "section_10.description": regexQuery },
                        { "section_10.badge": regexQuery },
                        { "section_11.cards.title": regexQuery },
                        { "section_11.cards.description": regexQuery },
                        { "section_12.title": regexQuery },
                        { "section_12.description": regexQuery },
                        { "section_12.cards.title": regexQuery },
                        { "section_12.cards.description": regexQuery },
                        { "overview.title": regexQuery },
                        { "overview.description": regexQuery },
                        { "overview.badge": regexQuery },
                        { "salary.title": regexQuery },
                        { "salary.description": regexQuery },
                        { "salary.badge": regexQuery },
                        { "salary.cards.title": regexQuery },
                        { "salary.cards.description": regexQuery },
                        { "funding.title": regexQuery },
                        { "funding.description": regexQuery },
                        { "funding.badge": regexQuery },
                        { "study.title": regexQuery },
                        { "study.description": regexQuery },
                        { "study.badge": regexQuery },
                        { "reviews.title": regexQuery },
                        { "reviews.description": regexQuery },
                        { "reviews.badge": regexQuery },
                        { "Entry.title": regexQuery },
                        { "Entry.description": regexQuery },
                        { "Entry.badge": regexQuery },
                        { "FAQ.title": regexQuery },
                        { "FAQ.description": regexQuery },
                        { "FAQ.cards.question": regexQuery },
                        { "FAQ.cards.answer": regexQuery }
                    ];

                    const matchingCms = await courseCmsDB.find(
                        { isDeleted: { $ne: true }, $or: courseCmsOrConditions },
                        { projection: { courseId: 1 } }
                    );
                    const matchingCourseIds = matchingCms.map((doc: any) => doc.courseId).filter(Boolean);

                    const courseFilter: any = { status: true, isDeleted: { $ne: true } };
                    const orConditions: any[] = [
                        { title: regexQuery },
                        { slug: regexQuery },
                        { shortDescription: regexQuery },
                        { longDescription: regexQuery }
                    ];

                    if (matchingCourseIds.length > 0) {
                        orConditions.push({ _id: { $in: matchingCourseIds } });
                    }

                    courseFilter.$or = orConditions;

                    const courses = await courseDB.find(courseFilter, { sort: { createdAt: -1 } });

                    // If no courses match, coursesResult will be an empty array []
                    coursesResult = courses.map((c) => ({
                        module: "Course",
                        title: c.title,
                        description: c.shortDescription || c.longDescription || "",
                        link: c.slug ? `degrees/course/${c.slug}` : ""
                    }));
                }

                // 2. Search Subjects & Subject CMS values
                if (searchSubjects) {
                    // Search in Subject CMS values across sections
                    const subjectCmsOrConditions: any[] = [
                        { "section_2.title": regexQuery },
                        { "section_2.description": regexQuery },
                        { "section_2.badge": regexQuery },
                        { "section_3.title": regexQuery },
                        { "section_3.description": regexQuery },
                        { "section_3.badge": regexQuery },
                        { "section_3.cards.title": regexQuery },
                        { "section_3.cards.description": regexQuery },
                        { "section_4.title": regexQuery },
                        { "section_4.badge": regexQuery },
                        { "section_4.cards.title": regexQuery },
                        { "section_4.cards.description": regexQuery },
                        { "section_5.title": regexQuery },
                        { "section_5.description": regexQuery },
                        { "section_5.badge": regexQuery },
                        { "section_5.cards.title": regexQuery },
                        { "section_5.cards.description": regexQuery },
                        { "section_6.cards.title": regexQuery },
                        { "section_6.cards.description": regexQuery },
                        { "section_7.title": regexQuery },
                        { "section_7.badge": regexQuery },
                        { "section_8.title": regexQuery },
                        { "section_8.badge": regexQuery },
                        { "section_9.title": regexQuery },
                        { "section_9.description": regexQuery },
                        { "section_10.cards.title": regexQuery },
                        { "section_10.cards.description": regexQuery },
                        { "section_11.title": regexQuery },
                        { "section_11.description": regexQuery },
                        { "section_11.cards.title": regexQuery },
                        { "section_11.cards.description": regexQuery }
                    ];

                    const matchingCms = await subjectCmsDB.find(
                        { isDeleted: { $ne: true }, $or: subjectCmsOrConditions },
                        { projection: { subjectId: 1 } }
                    );
                    const matchingSubjectIds = matchingCms.map((doc: any) => doc.subjectId).filter(Boolean);

                    const subjectFilter: any = { status: true, isDeleted: { $ne: true } };
                    const orConditions: any[] = [
                        { title: regexQuery },
                        { slug: regexQuery },
                        { badge: regexQuery },
                        { description: regexQuery }
                    ];

                    if (matchingSubjectIds.length > 0) {
                        orConditions.push({ _id: { $in: matchingSubjectIds } });
                    }

                    subjectFilter.$or = orConditions;

                    const subjects = await subjectDB.find(subjectFilter, { sort: { createdAt: -1 } });

                    // If no subjects match, subjectsResult will be an empty array []
                    subjectsResult = subjects.map((s) => ({
                        module: "Subject",
                        title: s.title,
                        description: s.description || "",
                        link: s.slug ? `degrees/${s.slug}` : ""
                    }));
                }

                // 3. Search Tools
                if (searchTools) {
                    const toolFilter: any = {
                        status: true,
                        isDeleted: { $ne: true },
                        $or: [
                            { title: regexQuery },
                            { description: regexQuery },
                            { badge: regexQuery },
                            { link: regexQuery }
                        ]
                    };

                    const tools = await toolDB.find(toolFilter, { sort: { createdAt: -1 } });

                    // If no tools match, toolsResult will be an empty array []
                    toolsResult = tools.map((t) => ({
                        module: "Tools",
                        title: t.title,
                        description: t.description || "",
                        link: t.link || ""
                    }));
                }
            }

            const total = coursesResult.length + subjectsResult.length + toolsResult.length;

            return {
                data: encrypt({
                    success: true,
                    search: rawQuery,
                    total,
                    data: {
                        courses: coursesResult,
                        combined: [
                            ...coursesResult,
                            ...subjectsResult,
                            ...toolsResult
                        ]
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[FrontendSearchController:search] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
