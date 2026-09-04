import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { config } from '../config';
import logger from './logger';

export async function saveSubmissionToSheet(formTitle: string, formFields: any[], formData: any) {
    try {
        if (!config.googleServiceAccountEmail || !config.googlePrivateKey || !config.googleSpreadsheetId) {
            logger.warn('Google Sheets configuration is missing. Skipping save to Google Sheets.');
            return;
        }

        const serviceAccountAuth = new JWT({
            email: config.googleServiceAccountEmail,
            key: config.googlePrivateKey,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
            ],
        });

        const doc = new GoogleSpreadsheet(config.googleSpreadsheetId, serviceAccountAuth);

        await doc.loadInfo();

        const today = new Date();
        // Format date as YYYY-MM-DD
        const dateString = today.toISOString().split('T')[0];

        let sheet = doc.sheetsByTitle[dateString];

        // Ensure headers exist (using label instead of name)
        // Add a "Submitted At" column at the very beginning
        const headers = ['Submitted At', ...formFields.map(f => f.label || f.name)];

        let headersInitialized = false;

        if (!sheet) {
            // Check if the default "Sheet1" exists and reuse it to avoid an empty first sheet
            const defaultSheet = doc.sheetsByTitle['Sheet1'];
            if (defaultSheet) {
                await defaultSheet.updateProperties({ title: dateString });
                sheet = defaultSheet;
                await sheet.setHeaderRow(headers);
                headersInitialized = true;
            } else {
                // Create a new sheet with the title as the date
                sheet = await doc.addSheet({ title: dateString, headerValues: headers });
                headersInitialized = true;
            }
        } else {
            try {
                await sheet.loadHeaderRow();
            } catch (e) {
                // If it fails to load headers (e.g., sheet is empty), set them
                await sheet.setHeaderRow(headers);
                headersInitialized = true;
            }
        }

        // Apply formatting to the headers
        // Load only the first row (headers)
        await sheet.loadCells({
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: headers.length
        });

        for (let i = 0; i < headers.length; i++) {
            const cell = sheet.getCell(0, i);
            cell.textFormat = { bold: true, fontSize: 12 };
        }

        await sheet.saveUpdatedCells();

        // Construct the row to insert based on the formData
        const row = formFields.reduce((acc, field) => {
            const headerKey = field.label || field.name;
            const val = formData[field.name];
            acc[headerKey] = typeof val === 'object' ? JSON.stringify(val) : String(val || '');
            return acc;
        }, { 'Submitted At': new Date().toLocaleString() } as Record<string, any>);

        // Insert a new blank row right below the header (at index 1)
        await sheet.insertDimension('ROWS', {
            startIndex: 1,
            endIndex: 2
        });

        // Load the cells of the newly inserted row
        await sheet.loadCells({
            startRowIndex: 1,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: headers.length
        });

        // Populate the cells with the form data and ensure standard formatting
        for (let i = 0; i < headers.length; i++) {
            const headerKey = headers[i];
            const cell = sheet.getCell(1, i);
            cell.value = row[headerKey] !== undefined ? row[headerKey] : '';
            cell.textFormat = { bold: false, fontSize: 10 };
        }

        await sheet.saveUpdatedCells();

    } catch (error) {
        logger.error('[GoogleSheets] Error saving submission:', error);
    }
}
