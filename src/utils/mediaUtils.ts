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

export const populateImages = async (obj: any, req: any): Promise<any> => {
    if (!obj || typeof obj !== 'object' || obj instanceof Date || (obj.constructor && obj.constructor.name === 'ObjectId')) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return Promise.all(obj.map(item => populateImages(item, req)));
    }

    const result: any = {};
    for (const key of Object.keys(obj)) {
        if (key === 'image' && obj[key]) {
            result[key] = obj[key];
            result['fullImageUrl'] = await getFullImageUrl(obj[key], req);
        } else if (typeof obj[key] === 'object') {
            result[key] = await populateImages(obj[key], req);
        } else {
            result[key] = obj[key];
        }
    }
    return result;
};
