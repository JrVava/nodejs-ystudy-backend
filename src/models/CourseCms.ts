import { ObjectId } from "mongodb";

export interface CardGeneral {
    title?: string;
    description?: string;
}

export interface CardWithBadge extends CardGeneral {
    badge?: string;
    salary?: string;
}

export interface CardWithLink extends CardGeneral {
    link?: string;
}

export interface CardWithIcon extends CardWithLink {
    icon?: string;
}

export interface CourseCms {
    _id?: ObjectId;
    courseId: ObjectId;
    courseType: 'General' | 'Social';
    kicker?: string;
    bannerStyle?: 'blue' | 'black' | 'white' | string;

    section_2?: {
        badge?: string;
        title?: string;
        description?: string;
    };
    
    section_3?: {
        badge?: string;
        title?: string;
        description?: string;
        cards?: CardGeneral[];
        status?: boolean;
    };
    
    section_4?: {
        badge?: string;
        title?: string;
        cards?: CardGeneral[];
        status?: boolean;
    };
    
    section_5?: {
        badge?: string;
        title?: string;
        description?: string;
        cards?: CardWithBadge[];
        status?: boolean;
    };
    
    section_6?: {
        badge?: string;
        title?: string;
        description?: string;
        status?: boolean;
    };
    
    section_7?: {
        badge?: string;
        title?: string;
        description?: string;
        status?: boolean;
    };
    
    section_8?: {
        badge?: string;
        title?: string;
        cards?: CardWithLink[];
        status?: boolean;
    };
    
    section_9?: {
        badge?: string;
        title?: string;
        description?: string;
        cards?: CardWithIcon[];
        status?: boolean;
    };
    
    section_10?: {
        badge?: string;
        title?: string;
        description?: string;
        featured_course?: ObjectId | string | null;
        status?: boolean;
    };
    
    section_11?: {
        cards?: CardGeneral[];
        status?: boolean;
    };
    
    section_12?: {
        title?: string;
        description?: string;
        cards?: CardWithLink[];
        status?: boolean;
    };

    createdAt?: Date;
    updatedAt?: Date;
    isDeleted?: boolean;
}
