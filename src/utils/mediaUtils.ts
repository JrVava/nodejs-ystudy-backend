import { ObjectId } from "mongodb";
import { QueryBuilder } from "../database/QueryBuilder";
import logger from "./logger";

export const getFullImageUrl = async (mediaId: string | ObjectId | null | undefined, req: any): Promise<string | null> => {
    if (!mediaId) return null;

    try {
        const mediaDB = new QueryBuilder<any>("media");
        const media = await mediaDB.findOne({ _id: new ObjectId(mediaId) });
        if (media && media.filePath) {
            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
            return `${baseUrl.replace(/\/$/, '')}/${media.filePath}`;
        }
    } catch (e) {
        logger.error(`Error fetching full image URL for mediaId: ${mediaId}`, e);
    }
    return null;
};
