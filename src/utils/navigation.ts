export function buildTree(pages: any[], parentId: string | null = null): any[] {
    return pages
        .filter(page => page.parentId === parentId)
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map(page => ({
            ...page,
            children: buildTree(pages, page._id)
        }));
}
