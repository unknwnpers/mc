// lib/types.ts

// --- PRODUCT ---
export interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    sizes: string[];
    is_active: boolean;
    image_url?: string;
    category_id?: string;
    category_slug?: string;
    description?: string;
    is_featured?: boolean;
    created_at: any;
    updated_at: any;
}

// --- CATEGORY ---
export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image_url?: string;
    created_at?: any;
}

// --- USER ---
export interface UserProfile {
    uid: string;
    name: string | null;
    email: string | null;
    role: "customer" | "admin" | "superadmin";
    address?: string;
    phone?: string;
    city?: string;
    pincode?: string;
    created_at: any;
    updated_at?: any;
}

// --- ORDER ---
export interface OrderItem {
    productId: string;
    name: string;
    size: string;
    quantity: number;
    price: number;
}

export interface OrderPayment {
    razorpay_order_id: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    status: "paid" | "failed" | "pending";
}

export interface OrderShipping {
    name: string;
    phone: string;
    address: string;
    city?: string;
    pincode?: string;
}

export interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
    payment: OrderPayment;
    shipping: OrderShipping;
    created_at: any;
    updated_at: any;
}

// --- LOGS ---
export interface InventoryLog {
    id?: string; // Document ID
    productId: string;
    change: number; // e.g. -2, 5
    reason: "order_created" | "order_cancelled" | "admin_update";
    orderId?: string;
    created_at: any;
}

export interface AdminLog {
    id?: string; // Document ID
    adminId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: string;
    created_at: any;
}