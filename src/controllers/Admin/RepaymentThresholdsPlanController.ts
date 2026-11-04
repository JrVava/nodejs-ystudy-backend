import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete, Put } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { RepaymentThresholdsPlan, TableColumn, TableRow } from "../../models/RepaymentThresholdsPlan";
import { ObjectId } from "mongodb";

// Helper to normalize columns format: ensure each column has a valid key and header
function normalizeColumns(columns: any[]): TableColumn[] {
    if (!Array.isArray(columns)) return [];
    return columns.map((col, idx) => {
        if (typeof col === "string") {
            const cleanKey = col.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `col_${idx}`;
            return { key: cleanKey, header: col };
        }
        const key = col.key || (col.header ? col.header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") : `col_${idx}`);
        return {
            key,
            header: col.header || col.label || key
        };
    });
}

// Helper to normalize rows: ensure every row has keys matching all columns
function normalizeRows(columns: TableColumn[], rows: any[]): TableRow[] {
    if (!Array.isArray(rows)) return [];

    return rows.map((row: any) => {
        const isHighlighted = !!row?.isHighlighted;
        const normalizedRow: TableRow = { isHighlighted };

        columns.forEach((col, idx) => {
            // Check direct key, or array cells
            if (row[col.key] !== undefined) {
                normalizedRow[col.key] = row[col.key];
            } else if (Array.isArray(row.cells) && row.cells[idx] !== undefined) {
                normalizedRow[col.key] = row.cells[idx];
            } else if (Array.isArray(row) && row[idx] !== undefined) {
                normalizedRow[col.key] = row[idx];
            } else {
                normalizedRow[col.key] = "";
            }
        });

        return normalizedRow;
    });
}

@JsonController("/repayment-thresholds-plans")
@UseBefore(AdminMiddleware)
export class RepaymentThresholdsPlanController {

    @Post("/add")
    async addPlan(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const rawColumns = decryptedBody.columns || decryptedBody.headers;
            const rawRows = decryptedBody.rows;

            if (!rawColumns || !Array.isArray(rawColumns)) {
                throw new HttpError(400, "columns must be an array of column definitions (each with its own header)");
            }
            if (!rawRows || !Array.isArray(rawRows)) {
                throw new HttpError(400, "rows must be an array");
            }

            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");

            const columns = normalizeColumns(rawColumns);
            const rows = normalizeRows(columns, rawRows);

            const newPlan: RepaymentThresholdsPlan = {
                columns,
                rows,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await planDB.insertOne(newPlan);

            return {
                data: encrypt({
                    success: true,
                    message: "Repayment thresholds plan created successfully",
                    planId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:addPlan] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listPlans(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc"
    ) {
        try {
            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");

            const filter: any = { isDeleted: { $ne: true } };
            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };

            const results = await planDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(p => ({
                        _id: p._id?.toString(),
                        columns: p.columns,
                        rows: p.rows,
                        status: p.status,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:listPlans] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllPlans() {
        try {
            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");

            const plans = await planDB.find({ status: true, isDeleted: { $ne: true } });

            return {
                data: encrypt({
                    success: true,
                    data: plans.map(p => ({
                        ...p,
                        _id: p._id?.toString()
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:getAllPlans] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getPlanById(@Param("id") id: string) {
        try {
            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid plan ID format");
            }

            const plan = await planDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!plan) {
                throw new HttpError(404, "Plan not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...plan,
                        _id: plan._id?.toString()
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:getPlanById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updatePlan(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid plan ID format");
            }

            const existingPlan = await planDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!existingPlan) {
                throw new HttpError(404, "Plan not found");
            }

            const rawColumns = decryptedBody.columns || decryptedBody.headers || existingPlan.columns;
            const columns = normalizeColumns(rawColumns);

            const rawRows = decryptedBody.rows !== undefined ? decryptedBody.rows : existingPlan.rows;
            const rows = normalizeRows(columns, rawRows);

            const updateFields: any = {
                columns,
                rows,
                updatedAt: new Date()
            };

            if (decryptedBody.status !== undefined) {
                updateFields.status = decryptedBody.status;
            }

            const result = await planDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Plan not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Repayment thresholds plan updated successfully",
                    columns,
                    rows
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:updatePlan] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Post("/add-column/:id")
    async addColumn(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const { header, key, defaultValue } = decryptedBody;

            if (!header) {
                throw new HttpError(400, "Column header is required");
            }

            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");
            const objId = new ObjectId(id);

            const plan = await planDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!plan) {
                throw new HttpError(404, "Plan not found");
            }

            const cleanKey = key || header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `col_${(plan.columns || []).length}`;
            const newColumn: TableColumn = { key: cleanKey, header };

            const updatedColumns = [...(plan.columns || []), newColumn];

            // Add the new column key to every existing row
            const updatedRows = (plan.rows || []).map((row: any) => ({
                ...row,
                [cleanKey]: defaultValue !== undefined ? defaultValue : ""
            }));

            await planDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { columns: updatedColumns, rows: updatedRows, updatedAt: new Date() } }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Column and header added successfully",
                    columns: updatedColumns,
                    rows: updatedRows
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:addColumn] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Post("/remove-column/:id")
    async removeColumn(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const { key, index } = decryptedBody;

            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");
            const objId = new ObjectId(id);

            const plan = await planDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!plan) {
                throw new HttpError(404, "Plan not found");
            }

            const existingColumns = plan.columns || [];
            let targetKey = key;

            if (index !== undefined && typeof index === "number" && index >= 0 && index < existingColumns.length) {
                targetKey = existingColumns[index].key;
            }

            if (!targetKey) {
                throw new HttpError(400, "Column key or valid index is required to remove");
            }

            const updatedColumns = existingColumns.filter(c => c.key !== targetKey);

            // Remove the column key from every row
            const updatedRows = (plan.rows || []).map((row: any) => {
                const copy = { ...row };
                delete copy[targetKey];
                return copy;
            });

            await planDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { columns: updatedColumns, rows: updatedRows, updatedAt: new Date() } }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Column removed successfully",
                    columns: updatedColumns,
                    rows: updatedRows
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:removeColumn] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Post("/add-row/:id")
    async addRow(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const { row } = decryptedBody;

            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");
            const objId = new ObjectId(id);

            const plan = await planDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!plan) {
                throw new HttpError(404, "Plan not found");
            }

            const columns = plan.columns || [];
            const newRow: TableRow = {
                isHighlighted: !!row?.isHighlighted
            };

            // Map values for each column in the table
            columns.forEach((col, idx) => {
                if (row && row[col.key] !== undefined) {
                    newRow[col.key] = row[col.key];
                } else if (row && Array.isArray(row.cells) && row.cells[idx] !== undefined) {
                    newRow[col.key] = row.cells[idx];
                } else {
                    newRow[col.key] = "";
                }
            });

            const updatedRows = [...(plan.rows || []), newRow];

            await planDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { rows: updatedRows, updatedAt: new Date() } }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Row added successfully",
                    rows: updatedRows
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:addRow] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete-row/:id/:rowIndex")
    async deleteRow(
        @Param("id") id: string,
        @Param("rowIndex") rowIndex: string
    ) {
        try {
            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");
            const objId = new ObjectId(id);
            const idx = parseInt(rowIndex, 10);

            const plan = await planDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!plan) {
                throw new HttpError(404, "Plan not found");
            }

            const updatedRows = [...(plan.rows || [])];
            if (isNaN(idx) || idx < 0 || idx >= updatedRows.length) {
                throw new HttpError(400, "Invalid row index");
            }

            updatedRows.splice(idx, 1);

            await planDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { rows: updatedRows, updatedAt: new Date() } }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Row deleted successfully",
                    rows: updatedRows
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:deleteRow] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Put("/toggle-status/:id")
    async toggleStatus(@Param("id") id: string) {
        try {
            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");
            const objId = new ObjectId(id);

            const item = await planDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!item) {
                throw new HttpError(404, "Plan not found");
            }

            const newStatus = !item.status;
            await planDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { status: newStatus, updatedAt: new Date() } }
            );

            return {
                data: encrypt({
                    success: true,
                    message: `Plan status updated to ${newStatus ? "active" : "inactive"}`,
                    status: newStatus
                })
            };
        } catch (error) {
            logger.error(`[RepaymentThresholdsPlanController:toggleStatus] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deletePlan(@Param("id") id: string) {
        try {
            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid plan ID format");
            }

            const result = await planDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Plan not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Repayment thresholds plan deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[RepaymentThresholdsPlanController:deletePlan] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
