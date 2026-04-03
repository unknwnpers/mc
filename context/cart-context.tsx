"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { toast } from "sonner";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  sku: string;           // variant SKU — canonical key
  selectedSize: string;  // display label shown in cart UI (= sku for size-only)
  stock?: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (id: string, sku: string) => Promise<void>;
  updateQuantity: (id: string, qty: number, sku: string) => Promise<void>;
  clearCart: () => Promise<void>;
  loading: boolean;
};

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchCart();
        } else {
            setCart([]);
        }
    }, [user]);

    const fetchCart = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const snapshot = await getDocs(
                collection(db, "users", user.uid, "cart")
            );

            setCart(
                snapshot.docs.map((docSnap) => ({
                    ...docSnap.data(),
                })) as CartItem[]
            );
        } catch (err) {
            console.error("Error fetching cart:", err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (item: CartItem) => {
        if (!user) {
            toast.info("Please login first to add items to your cart");
            return;
        }

        try {
            // 1. Fetch latest product info & stock
            const productSnap = await getDoc(doc(db, "products", item.id));
            if (!productSnap.exists()) {
                toast.error("Product no longer available");
                return;
            }
            const productData = productSnap.data();
            const variants    = (productData.variants || []) as any[];
            const variant     = variants.find((v: any) => v.sku === item.sku);
            const currentStock = variant?.stock ?? 0;

            // Require a valid SKU
            if (!item.sku) {
                toast.error("Please select a size first");
                return;
            }

            if (currentStock <= 0) {
                toast.error("Out of stock");
                return;
            }

            const cartRef = collection(db, "users", user.uid, "cart");
            const q = query(
                cartRef,
                where("id",  "==", item.id),
                where("sku", "==", item.sku)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                const newQty = docSnap.data().quantity + 1;

                if (newQty > currentStock) {
                    toast.error(`Only ${currentStock} items in stock`);
                    return;
                }

                await updateDoc(
                    doc(db, "users", user.uid, "cart", docSnap.id),
                    {
                        quantity: newQty,
                    }
                );
            } else {
                await addDoc(cartRef, { ...item, stock: currentStock });
            }

            toast.success(`${item.name} (Size: ${item.selectedSize}) added to cart!`);
            await fetchCart();
        } catch (err) {
            toast.error("Failed to add to cart");
        }
    };

  const removeFromCart = async (id: string, sku: string) => {
    if (!user) return;
    const cartRef = collection(db, "users", user.uid, "cart");
    const q = query(
        cartRef, 
        where("id", "==", id),
        where("sku", "==", sku)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await deleteDoc(
        doc(db, "users", user.uid, "cart", snapshot.docs[0].id)
      );
    }

    await fetchCart();
  };

  const updateQuantity = async (id: string, qty: number, sku: string) => {
    if (!user) return;

    const productSnap = await getDoc(doc(db, "products", id));
    if (productSnap.exists()) {
        const productData  = productSnap.data();
        const variants     = (productData.variants || []) as any[];
        const variant      = variants.find((v: any) => v.sku === sku);
        const currentStock = variant?.stock ?? 0;
        if (qty > currentStock) {
            toast.error(`Only ${currentStock} items in stock`);
            return;
        }
    }

    const cartRef = collection(db, "users", user.uid, "cart");
    const q = query(
        cartRef,
        where("id",  "==", id),
        where("sku", "==", sku)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await updateDoc(
        doc(db, "users", user.uid, "cart", snapshot.docs[0].id),
        {
          quantity: qty,
        }
      );
    }

    await fetchCart();
  };

  const clearCart = async () => {
    if (!user) return;
    const snapshot = await getDocs(
      collection(db, "users", user.uid, "cart")
    );

    await Promise.all(
      snapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, "users", user.uid, "cart", docSnap.id))
      )
    );

    setCart([]);
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, loading }}
    >
      {children}
    </CartContext.Provider>
  );
};
