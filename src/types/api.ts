export type ApiId = number;

export type ApiDateTimeString = string;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface ApiPaginationMeta {
  total: number;
  page: number;
  lastPage: number;
  perPage: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiPaginationMeta;
}

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type Category = 'HOODIE' | 'T_SHIRT' | 'SWEATSHIRT' | 'VEST' | 'CAP';

export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'FAILED';

export interface User {
  id: ApiId;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  region?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: ApiDateTimeString;
  updatedAt: ApiDateTimeString;
}

export interface AuthRegisterRequest {
  fullName: string;
  phone: string;
  password: string;
  email: string;
  region?: string;
  address?: string;
}

export interface AuthRegisterResponse {
  message: string;
  user: Omit<User, 'updatedAt' | 'createdAt'> & {
    createdAt?: ApiDateTimeString;
    updatedAt?: ApiDateTimeString;
  };
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  user: User;
  accessToken: string;
}

export interface AuthSendOtpRequest {
  email: string;
}

export interface AuthSendOtpResponse {
  message: string;
}

export interface AuthVerifyOtpRequest {
  email: string;
  otpCode: string;
}

export interface AuthVerifyOtpResponse {
  message: string;
}

export interface AuthForgotPasswordRequest {
  email: string;
}

export interface AuthForgotPasswordResponse {
  message: string;
}

export interface AuthResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthResetPasswordResponse {
  message: string;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
}

export interface AuthUpdateProfileRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;
}

export type AuthGetProfileResponse = User;

export interface Product {
  id: ApiId;
  name: string;
  description?: string | null;
  category: Category;
  createdAt: ApiDateTimeString;
  variants?: Variant[];
}

export interface Variant {
  id: ApiId;
  productId: ApiId;
  color: string;
  size: Size;
  stock: number;
  price: number;
  frontImage: string;
  backImage: string;
  printAreaTop: number;
  printAreaLeft: number;
  printAreaWidth: number;
  printAreaHeight: number;
}

export interface Asset {
  id: ApiId;
  url: string;
  userId: ApiId;
  createdAt: ApiDateTimeString;
  user?: {
    id: ApiId;
    fullName: string;
    email: string;
  };
}

export interface OrderItem {
  id: ApiId;
  orderId: ApiId;
  variantId: ApiId;
  quantity: number;
  price: number;
  frontDesign?: JsonValue;
  frontPreviewUrl?: string | null;
  backDesign?: JsonValue;
  backPreviewUrl?: string | null;
  finalPrintFile?: string | null;
  variant?: Variant & { product?: Product };
}

export interface Order {
  id: ApiId;
  userId?: ApiId | null;
  customerName: string;
  customerPhone: string;
  region: string;
  address: string;
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: ApiDateTimeString;
  updatedAt: ApiDateTimeString;
  items?: OrderItem[];
  user?: {
    id: ApiId;
    fullName: string;
    email: string;
    phone?: string;
  };
}

export interface CreateOrderItemRequest {
  variantId: ApiId;
  quantity: number;
  price: number;
  frontDesign?: JsonValue;
  frontPreviewUrl?: string;
  backDesign?: JsonValue;
  backPreviewUrl?: string;
  finalPrintFile?: string;
}

export interface CreateOrderRequest {
  customerName: string;
  customerPhone: string;
  region: string;
  address: string;
  totalPrice: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  items: CreateOrderItemRequest[];
}

export type CreateOrderResponse = Order;

export interface CartItem {
  id: ApiId;
  cartId: ApiId;
  variantId: ApiId;
  quantity: number;
  frontDesign?: JsonValue;
  backDesign?: JsonValue;
  frontPreviewUrl?: string | null;
  backPreviewUrl?: string | null;
  createdAt: ApiDateTimeString;
  variant?: Variant & { product?: Product };
}

export interface Cart {
  id: ApiId;
  userId: ApiId;
  items: CartItem[];
  updatedAt: ApiDateTimeString;
}

export interface AddToCartRequest {
  variantId: ApiId;
  quantity: number;
  frontDesign?: JsonValue;
  backDesign?: JsonValue;
  frontPreviewUrl?: string;
  backPreviewUrl?: string;
}

export interface UpdateCartItemRequest {
  quantity: number;
}
