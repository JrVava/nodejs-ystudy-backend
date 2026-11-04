import { ObjectId } from "mongodb";

export interface TableColumn {
    id?: string;
    key: string;       // Unique key for the column, e.g. "plan", "weekly", "monthly", "yearly", "who_for"
    header: string;    // Header text for this column, e.g. "Plan", "Weekly", "Monthly", "Yearly", "Who it's usually for"
}

export interface TableRow {
    id?: string;
    isHighlighted?: boolean;
    cells?: string[];  // optional support for array cells
    [key: string]: any; // direct column key mapping, e.g. { plan: "Plan 1", weekly: "£517", ... }
}

export interface RepaymentThresholdsPlan {
    _id?: ObjectId;
    columns: TableColumn[];
    rows: TableRow[];
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
