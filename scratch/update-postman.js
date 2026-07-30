const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../yStudy_API_Collection.postman_collection.json');

try {
  const collectionRaw = fs.readFileSync(collectionPath, 'utf8');
  const collection = JSON.parse(collectionRaw);
  
  const adminDynamicFormItem = {
    "name": "Admin DynamicFormController",
    "item": [
      {
        "name": "GET /dynamic-forms",
        "request": {
          "method": "GET",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "url": {
            "raw": "{{base_url}}/dynamic-forms",
            "host": ["{{base_url}}"],
            "path": ["dynamic-forms"]
          }
        }
      },
      {
        "name": "POST /dynamic-forms/update",
        "request": {
          "method": "POST",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": {
            "mode": "raw",
            "raw": "{\n    \"data\": \"encrypted_string_here\"\n}"
          },
          "url": {
            "raw": "{{base_url}}/dynamic-forms/update",
            "host": ["{{base_url}}"],
            "path": ["dynamic-forms", "update"]
          }
        }
      }
    ]
  };

  const frontendDynamicFormItem = {
    "name": "Frontend DynamicFormController",
    "item": [
      {
        "name": "POST /frontend/dynamic-forms/config",
        "request": {
          "method": "POST",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": {
            "mode": "raw",
            "raw": "{\n    \"data\": \"encrypted_string_here_optional\"\n}"
          },
          "url": {
            "raw": "{{base_url}}/frontend/dynamic-forms/config",
            "host": ["{{base_url}}"],
            "path": ["frontend", "dynamic-forms", "config"]
          }
        }
      },
      {
        "name": "POST /frontend/dynamic-forms/submit",
        "request": {
          "method": "POST",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": {
            "mode": "raw",
            "raw": "{\n    \"data\": \"encrypted_string_here_with_formData\"\n}"
          },
          "url": {
            "raw": "{{base_url}}/frontend/dynamic-forms/submit",
            "host": ["{{base_url}}"],
            "path": ["frontend", "dynamic-forms", "submit"]
          }
        }
      }
    ]
  };

  // Check if they already exist
  const existingAdminIdx = collection.item.findIndex(i => i.name === "Admin DynamicFormController");
  if (existingAdminIdx >= 0) collection.item.splice(existingAdminIdx, 1);
  
  const existingFrontendIdx = collection.item.findIndex(i => i.name === "Frontend DynamicFormController");
  if (existingFrontendIdx >= 0) collection.item.splice(existingFrontendIdx, 1);

  collection.item.push(adminDynamicFormItem);
  collection.item.push(frontendDynamicFormItem);

  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
  console.log("Postman collection updated successfully.");
} catch (error) {
  console.error("Failed to update Postman collection:", error);
}
