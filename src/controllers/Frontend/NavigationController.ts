import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Navigation } from "../../models/Navigation";
import { buildTree } from "../../utils/navigation";

@JsonController("/frontend/navigations")
export class FrontendNavigationController {

    @Get("/")
    async getNavigationTree() {
        try {
            const qb = new QueryBuilder<Navigation>("navigations");
            
            // We usually only want active navigations for the frontend
            const pages = await qb.find({ status: true, slug: { $ne: 'home' } });
            
            const formattedPages = pages.map(p => ({
                ...p,
                _id: p._id!.toString(),
                parentId: p.parentId ? p.parentId.toString() : null
            }));
            
            return {
                data: encrypt({
                    success: true,
                    data: buildTree(formattedPages)
                })
            };
        } catch (error) {
            logger.error(`[FrontendNavigationController:getNavigationTree] Error occurred:`, error);
            throw new HttpError(500, "Internal server error");
        }
    }
}
