import { ObjectId } from "mongodb";

export interface BannerItem {
    title?: string;
    subtitle?: string;
    description?: string;
    value?: string;
    icon?: string;
}

export interface Banner {
    _id?: ObjectId;
    internalName: string;
    bgColor?: string;

    background?: {
        imageUrl?: string | ObjectId | null;
    };

    leftContent: {
        badgeText?: string;
        badgeIcon?: string;
        title: string;
        description?: string;
        footerItems?: Array<{ label: string; value: string }>;
    };

    rightCard: {
        layoutType: 'stacked-cards' | 'stats-highlight' | 'grid-2x2' | 'list-items' | 'list-items';
        title?: string;
        description?: string;
        mainValue?: string;
        items?: BannerItem[];
    };

    isActive: boolean;
    isDeleted?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
