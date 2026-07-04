const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../src/controllers/Admin');
const collectionPath = path.join(__dirname, '../yStudy_API_Collection.postman_collection.json');

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));

// Regex to match Controller classes and their decorators
const controllerRegex = /@JsonController\(['"]([^'"]+)['"]\)\s*(?:@UseBefore\([^)]+\)\s*)?export\s+class\s+([A-Za-z0-9_]+)/g;
const methodRegex = /@(Get|Post|Put|Delete)\(['"]([^'"]+)['"]\)/g;

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
    const content = fs.readFileSync(path.join(controllersDir, file), 'utf-8');
    
    // Find base route and controller name
    let controllerMatch;
    let baseRoute = "";
    let controllerName = file.replace('.ts', '');
    
    // reset regex index
    controllerRegex.lastIndex = 0;
    while ((controllerMatch = controllerRegex.exec(content)) !== null) {
        baseRoute = controllerMatch[1];
        controllerName = controllerMatch[2];
    }
    
    // Find or create folder in postman collection
    let folder = collection.item.find(i => i.name === controllerName);
    if (!folder) {
        folder = { name: controllerName, item: [] };
        collection.item.push(folder);
    }
    
    // Extract methods
    let methodMatch;
    // reset regex
    methodRegex.lastIndex = 0;
    while ((methodMatch = methodRegex.exec(content)) !== null) {
        const httpMethod = methodMatch[1].toUpperCase();
        let routePath = methodMatch[2];
        
        let fullPath = baseRoute + routePath;
        // remove leading and trailing slashes for formatting
        fullPath = fullPath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        
        const endpointName = `${httpMethod} /${fullPath}`;
        
        // Check if exists
        const exists = folder.item.some(i => {
            // postman names might just be "GET /something"
            // or the path matches
            if (i.name === endpointName) return true;
            if (i.request && i.request.method === httpMethod) {
                const reqPath = i.request.url.path.join('/');
                if (reqPath === fullPath) return true;
            }
            return false;
        });
        
        if (!exists) {
            console.log(`Adding ${endpointName} to ${controllerName}`);
            
            const newItem = {
                name: endpointName,
                request: {
                    method: httpMethod,
                    header: [
                        { key: "Content-Type", value: "application/json" }
                    ],
                    url: {
                        raw: `{{base_url}}/${fullPath}`,
                        host: ["{{base_url}}"],
                        path: fullPath.split('/')
                    }
                }
            };
            
            // Add body if POST/PUT
            if (httpMethod === 'POST' || httpMethod === 'PUT') {
                newItem.request.body = {
                    mode: "raw",
                    raw: "{\n    \"data\": \"encrypted_string_here\"\n}"
                };
            }
            
            folder.item.push(newItem);
        }
    }
});

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 4));
console.log('Postman collection updated successfully.');
