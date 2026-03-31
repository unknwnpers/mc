// ── Canonical Product Schema ──────────────────────────────────────────────────

export interface ProductVariant {
  sku: string;                        // e.g. "S", "30", "3-6M", "Free Size"
  options: Record<string, string>;    // e.g. { Size: "S" }  — multi-dim ready
  price: number;
  stock: number;
}

export interface ProductOption {
  name: string;                       // e.g. "Size"
  values: string[];                   // e.g. ["S", "M", "L", "XL"]
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  images: string[];                   // array of URLs
  category_slug?: string;
  options: ProductOption[];           // axis definitions
  variants: ProductVariant[];         // all purchasable SKUs
  isActive: boolean;
  is_featured?: boolean;
  createdAt: any;
  updatedAt: any;
}

// ── Category ──────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  created_at?: any;
}

// ── User ─────────────────────────────────────────────────────────────────────

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

// ── Order ─────────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;           // productId
  name: string;
  sku: string;          // variant SKU
  selectedSize: string; // display alias (= sku for size-only products)
  selectedOptions?: Record<string, string>;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "failed";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  reservationId?: string;
  recipient: { name: string; phone: string };
  shipping: { address: string; city?: string; pincode?: string };
  createdAt: any;
  updatedAt: any;
}

// ── Cart (client-side) ────────────────────────────────────────────────────────

export interface CartItem {
  id: string;           // productId
  name: string;
  price: number;
  image: string;
  quantity: number;
  sku: string;          // variant SKU — used for reservation
  selectedSize: string; // display label shown in cart UI
  stock?: number;
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export interface AdminLog {
  id?: string;
  adminId: string;
  action: string;
  resourceId?: string;
  details?: string;
  createdAt: any;
}