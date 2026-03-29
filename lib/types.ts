// lib/types.ts

export interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    image_url: string;
    description?: string;
    category_id: string;
    category_slug: string;
    stock: number;
    is_featured: boolean;
    created_at: any;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image_url?: string;
    created_at?: any;
}

export interface UserProfile {
    uid: string;
    name: string | null;
    email: string | null;
    address?: string;
    phone?: string;
    city?: string;
    pincode?: string;
    updated_at: any;
}

export interface Order {
    id: string;
    userId: string;
    items: any[];
    total: number;
    status: string;
    recipient: {
        name: string;
        phone: string;
    };
    shipping: {
        address: string;
        city: string;
        pincode: string;
    };
    reservationIds: string[];
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    createdAt: any;
    updatedAt: any;
}