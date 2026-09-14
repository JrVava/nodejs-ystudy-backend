import logger from "./logger";

/**
 * Revalidates a specific path on the Next.js frontend cache.
 * 
 * @param path The path to revalidate (e.g. "/degrees" or "/degrees/business-management-ba")
 * @param type The type of revalidation ('page' or 'layout')
 */
export async function revalidateFrontend(path: string, type?: 'page' | 'layout'): Promise<void> {
    try {
        // You should configure these in your .env file
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"; 
        const secret = process.env.REVALIDATION_SECRET || "my-super-secret-token";

        let url = `${frontendUrl}/api/revalidate?secret=${secret}&path=${encodeURIComponent(path)}`;
        if (type) {
            url += `&type=${type}`;
        }
        
        const response = await fetch(url, {
            method: 'POST',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            logger.error(`Frontend revalidation failed for ${path}: ${response.status} ${response.statusText}`, errorData);
            return;
        }

        logger.info(`Frontend revalidation successful for path: ${path}`);
    } catch (error: any) {
        logger.error(`Frontend revalidation error for ${path}: ${error.message}`);
    }
}
