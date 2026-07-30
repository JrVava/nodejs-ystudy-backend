import { ObjectId } from "mongodb";

export interface FormField {
    name: string;
    label: string;
    type: string; // e.g., "text", "email", "password", "radio", "checkbox", "textarea", "select"
    placeholder?: string;
    options?: string[]; // for radio, checkbox, select
    required?: boolean;
}

export interface DynamicForm {
    _id?: ObjectId;
    title: string;
    fields: FormField[];
    isActive?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
