const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/controllers/Admin/*.ts');

files.forEach(file => {
  if (file.includes('CourseController')) return; // Already updated

  let content = fs.readFileSync(file, 'utf8');
  
  // Update query params if it has pagination
  if (content.includes('@QueryParam("limit") limit: number = 10')) {
    content = content.replace(
      /@QueryParam\("limit"\)\s+limit:\s+number\s*=\s*10\s*\)/,
      '@QueryParam("limit") limit: number = 10,\n        @QueryParam("field") field: string = "createdAt",\n        @QueryParam("sort") sort: string = "desc"\n    )'
    );

    // Update ImageController differently
    if (file.includes('ImageController.ts')) {
        content = content.replace(
            /const results = await mediaDB\.paginate\(filter, Number\(page\), Number\(limit\), \{ createdAt: -1 \}\);/,
            'const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;\n      const sortOptions: any = { [field]: sortOrder };\n      const results = await mediaDB.paginate(filter, Number(page), Number(limit), sortOptions);'
        );
        fs.writeFileSync(file, content);
        return;
    }
    
    // Update CMSPageController differently
    if (file.includes('CMSPageController.ts')) {
        content = content.replace(
            /const results = await qb\.paginate\(\{\}, Number\(page\), Number\(limit\), \{ createdAt: -1 \}\);/,
            'const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;\n            const sortOptions: any = { [field]: sortOrder };\n            const results = await qb.paginate({}, Number(page), Number(limit), sortOptions);'
        );
        fs.writeFileSync(file, content);
        return;
    }

    // Update other controllers
    content = content.replace(
      /const results = await (\w+)DB\.paginate\(\{ isDeleted: \{ \$ne: true \} \}, Number\(page\), Number\(limit\), \{ createdAt: -1 \}\);/g,
      (match, dbName) => {
        return `const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;\n            const sortOptions: any = { [field]: sortOrder };\n            const results = await ${dbName}DB.paginate({ isDeleted: { $ne: true } }, Number(page), Number(limit), sortOptions);`;
      }
    );
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
