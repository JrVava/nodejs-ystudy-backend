import { JsonController, Get, HttpError, Req, Param } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Subject } from "../../models/Subject";
import { SubjectCms } from "../../models/SubjectCms";
import { Course } from "../../models/Course";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/subject")
export class FrontendSubjectController {

    @Get("/")
    async getAllSubjects(
        @Req() req: any
    ) {
        try {
            const subjectDB = new QueryBuilder<Subject>("subjects");

            const options: any = {
                projection: {
                    createdAt: 0,
                    updatedAt: 0,
                    isDeleted: 0
                }
            };

            const subjects = await subjectDB.find({ status: true, isDeleted: { $ne: true } }, options);

            const data = await Promise.all(subjects.map(async (s) => {
                const mapped: any = {
                    ...s,
                    _id: s._id?.toString()
                };

                if (s.image) {
                    mapped.image = s.image.toString();
                    mapped.fullImageUrl = await getFullImageUrl(s.image, req);
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
            logger.error(`[FrontendSubjectController:getAllSubjects] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/get-subject/:slug")
    async getSubjectBySlug(
        @Param("slug") slug: string,
        @Req() req: any
    ) {
        try {
            const subjectDB = new QueryBuilder<Subject>("subjects");
            const subjectCmsDB = new QueryBuilder<SubjectCms>("subjectCMS");
            const courseDB = new QueryBuilder<Course>("courses");

            const options: any = {
                projection: {
                    createdAt: 0,
                    updatedAt: 0,
                    isDeleted: 0
                }
            };

            const subject = await subjectDB.findOne({ slug: slug, status: true, isDeleted: { $ne: true } }, options);

            if (!subject) {
                throw new HttpError(404, "Subject not found");
            }

            const mapped: any = {
                ...subject,
                _id: subject._id?.toString()
            };

            const cms = await subjectCmsDB.findOne({ subjectId: subject._id, isDeleted: { $ne: true } });
            
            if (cms && cms.section_7) {
                const allSubjects = await subjectDB.find({ status: true, isDeleted: { $ne: true } }, { projection: { title: 1, slug: 1 } });
                (cms.section_7 as any).subjects = allSubjects.map(s => ({ title: s.title, slug: s.slug }));
            }

            mapped.cms = cms || null;

            const courses = await courseDB.find({ subjects: subject._id, isDeleted: { $ne: true } }, { projection: { _id: 1 } });
            mapped.courseIds = courses.map(c => c._id?.toString());

            if (subject.image) {
                mapped.image = subject.image.toString();
                mapped.fullImageUrl = await getFullImageUrl(subject.image, req);
            }

            return {
                data: encrypt({
                    success: true,
                    data: mapped
                })
            };
        } catch (error) {
            logger.error(`[FrontendSubjectController:getSubjectBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
