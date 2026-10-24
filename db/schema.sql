-- ShopNext — MySQL 8 schema (Hostinger managed MySQL)
-- IDs are VARCHAR so existing Firestore document IDs can be preserved
-- (orders embed product IDs inside their JSON items, so IDs must not change).
SET NAMES utf8mb4;

CREATE TABLE users (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  display_name  VARCHAR(255) NULL,
  photo_url     TEXT NULL,
  password_hash VARCHAR(255) NULL,            -- bcrypt
  fb_hash       VARCHAR(512) NULL,            -- legacy Firebase scrypt hash (cleared on first login)
  fb_salt       VARCHAR(255) NULL,
  google_sub    VARCHAR(64)  NULL,
  role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  blocked       TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google (google_sub)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE password_resets (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,   -- sha256 of the emailed token
  user_id    VARCHAR(40) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE addresses (
  id         VARCHAR(40) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(40) NOT NULL,
  data       JSON NOT NULL,                   -- fullName, phone, line1, city, pincode ... (form-defined)
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_addr_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE wishlist (
  user_id    VARCHAR(40) NOT NULL,
  product_id VARCHAR(40) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE carts (
  user_id    VARCHAR(40) NOT NULL PRIMARY KEY,
  data       JSON NOT NULL,                   -- {items, appliedCoupon, couponDiscount}
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE categories (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  name       VARCHAR(191) NOT NULL,
  slug       VARCHAR(191) NOT NULL,
  data       JSON NULL,                       -- emoji/description/etc. from the admin form
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_cat_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE products (
  id              VARCHAR(40)   NOT NULL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  slug            VARCHAR(255)  NOT NULL,
  description     MEDIUMTEXT NULL,
  price           DECIMAL(12,2) NOT NULL DEFAULT 0,
  compare_price   DECIMAL(12,2) NULL,
  category        VARCHAR(191)  NULL,         -- same value the app stores today (slug or id)
  tags            JSON NULL,
  has_variations  TINYINT(1) NOT NULL DEFAULT 0,
  variation_types JSON NULL,
  variants        JSON NULL,                  -- kept as JSON: stock changes happen under a row lock
  default_variant JSON NULL,
  stock           INT NOT NULL DEFAULT 0,
  sku             VARCHAR(100) NULL,
  featured        TINYINT(1) NOT NULL DEFAULT 0,
  images          JSON NULL,
  tax_rate        DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_type        ENUM('inclusive','exclusive') NOT NULL DEFAULT 'inclusive',
  rating          DECIMAL(3,1) NOT NULL DEFAULT 0,
  review_count    INT NOT NULL DEFAULT 0,
  sold_count      INT NOT NULL DEFAULT 0,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_products_slug (slug),
  KEY ix_products_category (category),
  KEY ix_products_featured (featured, created_at),
  KEY ix_products_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE coupons (
  id             VARCHAR(40)  NOT NULL PRIMARY KEY,
  code           VARCHAR(64)  NOT NULL,
  description    VARCHAR(255) NULL,
  discount_type  ENUM('flat','percent','free_shipping') NOT NULL,
  discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_discount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_order      DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_uses       INT NOT NULL DEFAULT 0,
  used_count     INT NOT NULL DEFAULT 0,
  expires_at     DATETIME NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_coupon_code (code)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id                  VARCHAR(40)   NOT NULL PRIMARY KEY,
  user_id             VARCHAR(40)   NOT NULL,
  status              VARCHAR(30)   NOT NULL DEFAULT 'pending',
  payment_method      VARCHAR(20)   NOT NULL,
  subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_tax           DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping            DECIMAL(12,2) NOT NULL DEFAULT 0,
  cod_fee             DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  total               DECIMAL(12,2) NOT NULL DEFAULT 0,
  coupon_id           VARCHAR(40)   NULL,
  coupon_code         VARCHAR(64)   NULL,
  coupon_type         VARCHAR(20)   NULL,
  razorpay_order_id   VARCHAR(64)   NULL,
  razorpay_payment_id VARCHAR(64)   NULL,
  customer_email      VARCHAR(255)  NULL,
  items               JSON NOT NULL,
  tax_breakdown       JSON NULL,
  shipping_address    JSON NULL,
  timeline            JSON NOT NULL,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_orders_user (user_id, created_at),
  KEY ix_orders_status (status),
  KEY ix_orders_created (created_at),
  UNIQUE KEY uq_orders_rzp (razorpay_order_id)
) ENGINE=InnoDB;
-- No FK orders.user_id -> users.id on purpose: deleting a customer must never delete order history.

CREATE TABLE returns (
  id             VARCHAR(40)   NOT NULL PRIMARY KEY,
  order_id       VARCHAR(40)   NOT NULL,
  user_id        VARCHAR(40)   NOT NULL,
  customer_email VARCHAR(255)  NULL,
  status         ENUM('pending','approved','rejected','refunded') NOT NULL DEFAULT 'pending',
  reason         VARCHAR(255)  NULL,
  custom_note    TEXT NULL,
  admin_note     TEXT NULL,
  refund_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20)   NULL,
  items          JSON NOT NULL,
  resolved_at    DATETIME NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_returns_order (order_id),
  KEY ix_returns_user (user_id),
  KEY ix_returns_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  product_id   VARCHAR(40)  NOT NULL,
  user_id      VARCHAR(40)  NOT NULL,
  display_name VARCHAR(255) NULL,
  rating       TINYINT NOT NULL,
  comment      TEXT NULL,
  helpful      INT NOT NULL DEFAULT 0,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_review_user_product (product_id, user_id),
  KEY ix_reviews_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE settings (
  `key`      VARCHAR(64) NOT NULL PRIMARY KEY,   -- e.g. 'shipping'
  value      JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
