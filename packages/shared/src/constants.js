// ─── User Roles ───────────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:        'SUPER_ADMIN',
  SUB_ADMIN:          'SUB_ADMIN',
  RESTAURANT_OWNER:   'RESTAURANT_OWNER',
  RESTAURANT_STAFF:   'RESTAURANT_STAFF',
  CUSTOMER:           'CUSTOMER',
  DRIVER:             'DRIVER',
};

// ─── Order Statuses ───────────────────────────────────────────────────────────
export const ORDER_STATUS = {
  PENDING:         'PENDING',
  PLACED:          'PLACED',
  ACCEPTED:        'ACCEPTED',
  PREPARING:       'PREPARING',
  READY:           'READY',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  ON_WAY:          'ON_WAY',
  DELIVERED:       'DELIVERED',
  CANCELLED:       'CANCELLED',
  REJECTED:        'REJECTED',
  FAILED:          'FAILED',
};

// ─── Order Types ──────────────────────────────────────────────────────────────
export const ORDER_TYPE = {
  STANDARD:  'STANDARD',
  DELIVERY:  'DELIVERY',
  PICKUP:    'PICKUP',
  SCHEDULED: 'SCHEDULED',
  GIFT:      'GIFT',
  GROUP:     'GROUP',
};

// ─── Payment Methods ──────────────────────────────────────────────────────────
export const PAYMENT_METHOD = {
  CARD:       'CARD',
  WALLET:     'WALLET',
  APPLE_PAY:  'APPLE_PAY',
  GOOGLE_PAY: 'GOOGLE_PAY',
  RAZORPAY:   'RAZORPAY',
};

// ─── Restaurant / Driver Statuses ─────────────────────────────────────────────
export const ENTITY_STATUS = {
  PENDING:       'PENDING',
  DOCS_REQUIRED: 'DOCS_REQUIRED',   // docs submitted, partial or rejected
  ACTIVE:        'ACTIVE',
  SUSPENDED:     'SUSPENDED',
  REJECTED:      'REJECTED',
};

export const DOC_STATUS = {
  NOT_UPLOADED: 'not_uploaded',
  PENDING:      'pending',
  APPROVED:     'approved',
  REJECTED:     'rejected',
};

// ─── Transaction Types ────────────────────────────────────────────────────────
export const TRANSACTION_TYPE = {
  CREDIT:    'CREDIT',
  DEBIT:     'DEBIT',
  REFUND:    'REFUND',
  TOP_UP:    'TOP_UP',
  PAYOUT:    'PAYOUT',
  REFERRAL:  'REFERRAL',
};

// ─── Dietary Tags ─────────────────────────────────────────────────────────────
export const DIETARY_TAGS = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Halal',
  'Nut-Free',
  'Dairy-Free',
];

// ─── Verification Status ──────────────────────────────────────────────────────
export const VERIFICATION_STATUS = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

// ─── Complaint Status ─────────────────────────────────────────────────────────
export const COMPLAINT_STATUS = {
  OPEN:        'OPEN',
  UNDER_REVIEW:'UNDER_REVIEW',
  RESOLVED:    'RESOLVED',
  CLOSED:      'CLOSED',
};

// ─── Gift Card Status ─────────────────────────────────────────────────────────
export const GIFT_CARD_STATUS = {
  ACTIVE:  'active',
  USED:    'used',
  EXPIRED: 'expired',
  VOIDED:  'voided',
};

// ─── Subscription Status ──────────────────────────────────────────────────────
export const SUBSCRIPTION_STATUS = {
  ACTIVE:    'active',
  CANCELLED: 'cancelled',
  EXPIRED:   'expired',
  PAST_DUE:  'past_due',
};

// ─── Delivery Model ───────────────────────────────────────────────────────────
export const DELIVERY_MODEL = {
  SELF:  'own',
  TASTR: 'tastr',
};

// ─── Commission Defaults ──────────────────────────────────────────────────────
export const COMMISSION_DEFAULTS = {
  SELF_DELIVERY_RATE:   10,   // %
  TASTR_DELIVERY_RATE:  18,   // %
  TASTR_DELIVERY_MIN:   15,
  TASTR_DELIVERY_MAX:   20,
};

// ─── Markup Types ─────────────────────────────────────────────────────────────
export const FEE_TYPE = {
  FIXED:   'fixed',
  PERCENT: 'percent',
};

// ─── Settlement / Payout ──────────────────────────────────────────────────────
export const PAYOUT_STATUS = {
  PENDING:    'pending',
  PROCESSING: 'processing',
  PAID:       'paid',
  FAILED:     'failed',
};

export const PAYOUT_CYCLE = {
  WEEKLY: 'weekly',
};

// ─── Driver Document Types ────────────────────────────────────────────────────
export const DRIVER_DOC_TYPE = {
  DRIVING_LICENCE:    'driving_licence',
  VEHICLE_INSURANCE:  'vehicle_insurance',
  FOOD_INSURANCE:     'food_insurance',
  RIGHT_TO_WORK:      'right_to_work',
  ADDRESS_PROOF:      'address_proof',
  PROFILE_PHOTO:      'profile_photo',
};

// ─── Agreement Types ──────────────────────────────────────────────────────────
export const AGREEMENT_TYPE = {
  RESTAURANT: 'restaurant',
  DRIVER:     'driver',
};

// ─── Revenue Stream Types ─────────────────────────────────────────────────────
export const REVENUE_STREAM = {
  MARKUP:          'markup',
  SERVICE_FEE:     'service_fee',
  COMMISSION:      'commission',
  DELIVERY_MARGIN: 'delivery_margin',
};

// ─── Cloudinary Folders ───────────────────────────────────────────────────────
export const CLOUDINARY_FOLDERS = {
  USERS:        'tastr/users',
  RESTAURANTS:  'tastr/restaurants',
  MENU:         'tastr/menu',
  DRIVERS:      'tastr/drivers',
  BANNERS:      'tastr/banners',
  COMPLAINTS:   'tastr/complaints',
  STORE:        'tastr/store',
  CMS:          'tastr/cms',
  STUDENT_DOCS: 'tastr/student-docs',
};

// ─── Token Config ─────────────────────────────────────────────────────────────
export const TOKEN_CONFIG = {
  ACCESS_EXPIRY:  '15m',
  REFRESH_EXPIRY: '30d',
  OTP_EXPIRY_SEC: 600,    // 10 minutes
  OTP_LENGTH:     6,
};

// ─── Rate Limits ──────────────────────────────────────────────────────────────
export const RATE_LIMITS = {
  AUTH_MAX:         5,
  AUTH_WINDOW_MIN:  1,
  OTP_MAX:          3,
  OTP_WINDOW_MIN:   15,
  API_MAX:          120,
  API_WINDOW_MIN:   1,
};



export const PLAN_INTERVAL = {
  MONTHLY: 'month',
  YEARLY:  'year',
};

// ─── Staff Permissions ────────────────────────────────────────────────────────
export const PERMISSIONS = {
  VIEW_ORDERS:       'VIEW_ORDERS',
  MANAGE_ORDERS:     'MANAGE_ORDERS',
  MANAGE_MENU:       'MANAGE_MENU',
  VIEW_REPORTS:      'VIEW_REPORTS',
  MANAGE_STAFF:      'MANAGE_STAFF',
  MANAGE_MARKETING:  'MANAGE_MARKETING',
  MANAGE_SETTINGS:   'MANAGE_SETTINGS',
  VIEW_FINANCE:      'VIEW_FINANCE',
};

// ─── Admin Permissions ────────────────────────────────────────────────────────
export const ADMIN_PERMISSIONS = {
  VIEW_RESTAURANTS:    'VIEW_RESTAURANTS',
  MANAGE_RESTAURANTS:  'MANAGE_RESTAURANTS',
  VIEW_ORDERS:         'VIEW_ORDERS',
  MANAGE_ORDERS:       'MANAGE_ORDERS',
  VIEW_CUSTOMERS:      'VIEW_CUSTOMERS',
  MANAGE_CUSTOMERS:    'MANAGE_CUSTOMERS',
  VIEW_DRIVERS:        'VIEW_DRIVERS',
  MANAGE_DRIVERS:      'MANAGE_DRIVERS',
  VIEW_FINANCE:        'VIEW_FINANCE',
  MANAGE_FINANCE:      'MANAGE_FINANCE',
  MANAGE_PROMOS:       'MANAGE_PROMOS',
  MANAGE_CMS:          'MANAGE_CMS',
  VIEW_LOGS:           'VIEW_LOGS',
  MANAGE_ADMINS:       'MANAGE_ADMINS',
};

// ─── Notification ─────────────────────────────────────────────────────────────
// ─── Payment Gateway ───────────────────────────────────────────────────────
export const PAYMENT_GATEWAY = {
  STRIPE:   'STRIPE',
  RAZORPAY: 'RAZORPAY',
};

// ─── Notification Event Types ─────────────────────────────────────────────────
export const NOTIF_EVENT = {
  ORDER_PLACED:        'order_placed',
  ORDER_ACCEPTED:      'order_accepted',
  ORDER_PREPARING:     'order_preparing',
  DRIVER_ASSIGNED:     'driver_assigned',
  ORDER_ON_WAY:        'order_on_way',
  ORDER_DELIVERED:     'order_delivered',
  ORDER_CANCELLED:     'order_cancelled',
  PAYMENT_FAILED:      'payment_failed',
  REFUND_ISSUED:       'refund_issued',
  WALLET_TOPUP:        'wallet_topup',
  WALLET_DEBIT:        'wallet_debit',
  REFERRAL_CREDIT:     'referral_credit',
  PROMO_NEW:           'promo_new',
  COMPLAINT_UPDATE:    'complaint_update',
  SUBSCRIPTION_RENEWED:'subscription_renewed',
  SUBSCRIPTION_FAILED: 'subscription_failed',
  SUBSCRIPTION_CANCELLED:'subscription_cancelled',
  STUDENT_APPROVED:    'student_approved',
  STUDENT_REJECTED:    'student_rejected',
  GIFT_CARD_RECEIVED:  'gift_card_received',
  BLAST:               'blast',
};

// ─── Export Formats ───────────────────────────────────────────────────────────
export const EXPORT_FORMAT = {
  CSV:   'csv',
  EXCEL: 'xlsx',
  PDF:   'pdf',
};

export const NOTIF_SEGMENT = {
  ALL:         'all',
  STUDENTS:    'students',
  TASTR_PLUS:  'tastr_plus',
  RESTAURANT:  'restaurant',
};
