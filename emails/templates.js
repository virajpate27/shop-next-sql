// src/emails/templates.js
import { APP_URL } from "@/lib/resend";

// ── Shared styles ──────────────────────────────────────────────────────────
const styles = {
  body: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #f5f5f5; margin: 0; padding: 0;`,
  wrapper: `max-width: 600px; margin: 0 auto; padding: 24px 16px;`,
  card: `background: #ffffff; border-radius: 16px; overflow: hidden;
         box-shadow: 0 1px 3px rgba(0,0,0,0.08);`,
  header: `background: #4f46e5; padding: 32px 32px 28px;`,
  logo: `color: #ffffff; font-size: 22px; font-weight: 700;
         margin: 0 0 4px; letter-spacing: -0.3px;`,
  headerSub: `color: #c7d2fe; font-size: 14px; margin: 0;`,
  body_inner: `padding: 32px;`,
  h2: `color: #111827; font-size: 20px; font-weight: 700;
       margin: 0 0 8px; letter-spacing: -0.2px;`,
  p: `color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px;`,
  btn: `display: inline-block; background: #4f46e5; color: #ffffff;
        text-decoration: none; padding: 12px 28px; border-radius: 10px;
        font-size: 14px; font-weight: 600; margin: 4px 0 24px;`,
  divider: `border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;`,
  table: `width: 100%; border-collapse: collapse; margin: 0 0 24px;`,
  th: `text-align: left; font-size: 11px; font-weight: 600; color: #9ca3af;
       text-transform: uppercase; letter-spacing: 0.05em;
       padding: 8px 12px; background: #f9fafb;
       border-bottom: 1px solid #f3f4f6;`,
  td: `padding: 12px; font-size: 14px; color: #374151;
       border-bottom: 1px solid #f9fafb; vertical-align: top;`,
  badge: (color) => `display: inline-block; background: ${color}20;
         color: ${color}; padding: 3px 10px; border-radius: 20px;
         font-size: 12px; font-weight: 600; text-transform: capitalize;`,
  footer: `padding: 20px 32px; background: #f9fafb;
           border-top: 1px solid #f3f4f6; text-align: center;`,
  footerText: `color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;`,
};

// ── Shared components ──────────────────────────────────────────────────────
function Header(subtitle = "") {
  return `
    <div style="${styles.header}">
      <p style="${styles.logo}">🛍 ShopNext</p>
      ${subtitle ? `<p style="${styles.headerSub}">${subtitle}</p>` : ""}
    </div>
  `;
}

function Footer() {
  return `
    <div style="${styles.footer}">
      <p style="${styles.footerText}">
        © ${new Date().getFullYear()} ShopNext. All rights reserved.<br>
        Questions? Reply to this email or visit
        <a href="${APP_URL}/orders" style="color: #4f46e5;">your orders</a>.
      </p>
    </div>
  `;
}

function formatPrice(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function statusColor(status) {
  const map = {
    pending: "#f59e0b",
    confirmed: "#3b82f6",
    processing: "#3b82f6",
    shipped: "#8b5cf6",
    delivered: "#10b981",
    cancelled: "#ef4444",
  };
  return map[status] || "#6b7280";
}

function OrderItemsTable(items) {
  return `
    <table style="${styles.table}">
      <thead>
        <tr>
          <th style="${styles.th}">Product</th>
          <th style="${styles.th}; text-align: right;">Qty</th>
          <th style="${styles.th}; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td style="${styles.td}">${item.name}</td>
            <td style="${styles.td}; text-align: right; color: #6b7280;">${item.quantity}</td>
            <td style="${styles.td}; text-align: right; font-weight: 600;">
              ${formatPrice(item.price * item.quantity)}
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function OrderSummaryBox(order) {
  return `
    <div style="background: #f9fafb; border-radius: 10px;
                padding: 16px 20px; margin: 0 0 24px;">
      <div style="display: flex; justify-content: space-between;
                  margin-bottom: 8px;">
        <span style="color: #6b7280; font-size: 14px;">Subtotal</span>
        <span style="font-size: 14px;">${formatPrice(order.subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;
                  margin-bottom: 8px;">
        <span style="color: #6b7280; font-size: 14px;">Shipping</span>
        <span style="font-size: 14px; color: ${order.shipping === 0 ? "#10b981" : "#374151"};">
          ${order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
        </span>
      </div>
      ${
        order.codFee > 0
          ? `
        <div style="display: flex; justify-content: space-between;
                    margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 14px;">COD fee</span>
          <span style="font-size: 14px;">${formatPrice(order.codFee)}</span>
        </div>
      `
          : ""
      }
      <div style="display: flex; justify-content: space-between;
                  padding-top: 12px; border-top: 1px solid #e5e7eb; margin-top: 8px;">
        <span style="font-weight: 700; font-size: 15px;">Total</span>
        <span style="font-weight: 700; font-size: 15px; color: #4f46e5;">
          ${formatPrice(order.total)}
        </span>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — Welcome email
// ═══════════════════════════════════════════════════════════════════════════
export function welcomeEmail({ displayName }) {
  return {
    subject: `Welcome to ShopNext, ${displayName}! 🎉`,
    html: `
      <!DOCTYPE html>
      <html><body style="${styles.body}">
        <div style="${styles.wrapper}">
          <div style="${styles.card}">
            ${Header("Your account is ready")}
            <div style="${styles.body_inner}">
              <h2 style="${styles.h2}">Hey ${displayName}, welcome aboard! 👋</h2>
              <p style="${styles.p}">
                Your ShopNext account is all set. Browse thousands of products
                with fast delivery across India and pay your way — Razorpay
                or Cash on Delivery.
              </p>
              <a href="${APP_URL}/products" style="${styles.btn}">
                Start shopping →
              </a>
              <hr style="${styles.divider}">
              <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                Questions? Just reply to this email — we're always here to help.
              </p>
            </div>
            ${Footer()}
          </div>
        </div>
      </body></html>
    `,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — Order confirmed (Razorpay + COD)
// ═══════════════════════════════════════════════════════════════════════════
export function orderConfirmedEmail({ order, orderId }) {
  const isRazorpay = order.paymentMethod === "razorpay";
  const addr = order.shippingAddress;

  return {
    subject: `Order confirmed — #${orderId.slice(0, 8).toUpperCase()} 🎉`,
    html: `
      <!DOCTYPE html>
      <html><body style="${styles.body}">
        <div style="${styles.wrapper}">
          <div style="${styles.card}">
            ${Header("Order confirmation")}
            <div style="${styles.body_inner}">
              <h2 style="${styles.h2}">Your order is confirmed! ✅</h2>
              <p style="${styles.p}">
                ${
                  isRazorpay
                    ? "Payment received successfully. We're preparing your order now."
                    : "Your Cash on Delivery order has been placed. Please keep the exact amount ready at delivery."
                }
              </p>

              <div style="background: #eef2ff; border-radius: 10px;
                          padding: 14px 20px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #6b7280;">Order ID</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700;
                           color: #4f46e5; font-family: monospace;">
                  #${orderId.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <p style="font-weight: 600; font-size: 14px; color: #374151;
                         margin: 0 0 12px;">
                Order items
              </p>
              ${OrderItemsTable(order.items)}
              ${OrderSummaryBox(order)}

              <p style="font-weight: 600; font-size: 14px; color: #374151;
                         margin: 0 0 12px;">
                Delivering to
              </p>
              <div style="background: #f9fafb; border-radius: 10px;
                          padding: 16px 20px; margin-bottom: 24px;
                          font-size: 14px; color: #374151; line-height: 1.6;">
                <strong>${addr.fullName}</strong><br>
                ${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}<br>
                ${addr.city}, ${addr.state} — ${addr.pincode}<br>
                📞 ${addr.phone}
              </div>

              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <a href="${APP_URL}/orders/${orderId}" style="${styles.btn}">
                  View order →
                </a>
              </div>
            </div>
            ${Footer()}
          </div>
        </div>
      </body></html>
    `,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — Order status updated
// ═══════════════════════════════════════════════════════════════════════════
export function orderStatusEmail({ order, orderId, newStatus }) {
  const messages = {
    processing: {
      emoji: "⚙️",
      title: "Your order is being processed",
      body: "Our team is packing your items and getting them ready for dispatch.",
    },
    shipped: {
      emoji: "🚚",
      title: "Your order is on its way!",
      body: "Your package has been dispatched and is heading to you. It should arrive within 3-5 business days.",
    },
    delivered: {
      emoji: "📦",
      title: "Order delivered successfully!",
      body: "Your order has been delivered. We hope you love your purchase! Leave a review to help other shoppers.",
    },
    cancelled: {
      emoji: "❌",
      title: "Your order has been cancelled",
      body: "Your order has been cancelled. If you paid online, the refund will be credited within 5-7 business days.",
    },
  };

  const msg = messages[newStatus] || {
    emoji: "📋",
    title: `Order status updated to ${newStatus}`,
    body: "Your order status has been updated.",
  };

  const color = statusColor(newStatus);

  return {
    subject: `${msg.emoji} Order #${orderId.slice(0, 8).toUpperCase()} — ${newStatus}`,
    html: `
      <!DOCTYPE html>
      <html><body style="${styles.body}">
        <div style="${styles.wrapper}">
          <div style="${styles.card}">
            ${Header("Order update")}
            <div style="${styles.body_inner}">
              <div style="font-size: 40px; margin-bottom: 16px;">${msg.emoji}</div>
              <h2 style="${styles.h2}">${msg.title}</h2>
              <p style="${styles.p}">${msg.body}</p>

              <div style="background: #f9fafb; border-radius: 10px;
                          padding: 14px 20px; margin-bottom: 24px;
                          display: flex; justify-content: space-between;
                          align-items: center;">
                <div>
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">Order ID</p>
                  <p style="margin: 4px 0 0; font-weight: 700; font-family: monospace;
                             font-size: 14px; color: #374151;">
                    #${orderId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <span style="${styles.badge(color)}">${newStatus}</span>
              </div>

              ${
                newStatus === "delivered"
                  ? `
                <a href="${APP_URL}/products" style="${styles.btn}">
                  Write a review →
                </a>
              `
                  : `
                <a href="${APP_URL}/orders/${orderId}" style="${styles.btn}">
                  Track order →
                </a>
              `
              }
            </div>
            ${Footer()}
          </div>
        </div>
      </body></html>
    `,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 4 — Payment failed
// ═══════════════════════════════════════════════════════════════════════════
export function paymentFailedEmail({ displayName, orderId, amount }) {
  return {
    subject: `Payment failed for your ShopNext order 😕`,
    html: `
      <!DOCTYPE html>
      <html><body style="${styles.body}">
        <div style="${styles.wrapper}">
          <div style="${styles.card}">
            ${Header()}
            <div style="${styles.body_inner}">
              <div style="font-size: 40px; margin-bottom: 16px;">❌</div>
              <h2 style="${styles.h2}">Payment unsuccessful</h2>
              <p style="${styles.p}">
                Hi ${displayName}, your payment of
                <strong>${formatPrice(amount)}</strong>
                for order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong>
                could not be processed.
              </p>
              <p style="${styles.p}">
                This can happen due to insufficient funds, an expired card,
                or a temporary bank issue. Your cart is still saved — simply
                try again with a different payment method.
              </p>
              <a href="${APP_URL}/cart" style="${styles.btn}">
                Retry payment →
              </a>
              <hr style="${styles.divider}">
              <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.6;">
                💡 Tip: Try paying via UPI or use Cash on Delivery if card payments aren't working.
              </p>
            </div>
            ${Footer()}
          </div>
        </div>
      </body></html>
    `,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 5 — Admin: new order alert
// ═══════════════════════════════════════════════════════════════════════════
export function adminNewOrderEmail({ order, orderId }) {
  const addr = order.shippingAddress;

  return {
    subject: `🛍 New order — #${orderId.slice(0, 8).toUpperCase()} (${formatPrice(order.total)})`,
    html: `
      <!DOCTYPE html>
      <html><body style="${styles.body}">
        <div style="${styles.wrapper}">
          <div style="${styles.card}">
            <div style="background: #111827; padding: 28px 32px;">
              <p style="${styles.logo}">ShopNext Admin</p>
              <p style="${styles.headerSub}">New order received</p>
            </div>
            <div style="${styles.body_inner}">
              <div style="display: flex; justify-content: space-between;
                          align-items: flex-start; flex-wrap: wrap; gap: 12px;
                          margin-bottom: 24px;">
                <div>
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">Order ID</p>
                  <p style="margin: 4px 0 0; font-weight: 700; font-family: monospace;
                             font-size: 18px; color: #111827;">
                    #${orderId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">Total</p>
                  <p style="margin: 4px 0 0; font-weight: 700; font-size: 22px;
                             color: #4f46e5;">
                    ${formatPrice(order.total)}
                  </p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr;
                          gap: 12px; margin-bottom: 24px;">
                <div style="background: #f9fafb; border-radius: 10px; padding: 14px;">
                  <p style="margin: 0; font-size: 11px; color: #9ca3af; font-weight: 600;
                             text-transform: uppercase; letter-spacing: 0.05em;">
                    Payment
                  </p>
                  <p style="margin: 6px 0 0; font-size: 14px; font-weight: 600;
                             color: ${order.paymentMethod === "cod" ? "#10b981" : "#4f46e5"};">
                    ${order.paymentMethod === "cod" ? "💵 Cash on Delivery" : "🔒 Razorpay"}
                  </p>
                </div>
                <div style="background: #f9fafb; border-radius: 10px; padding: 14px;">
                  <p style="margin: 0; font-size: 11px; color: #9ca3af; font-weight: 600;
                             text-transform: uppercase; letter-spacing: 0.05em;">
                    Customer
                  </p>
                  <p style="margin: 6px 0 0; font-size: 14px; font-weight: 600;
                             color: #374151;">
                    ${addr.fullName}
                  </p>
                </div>
              </div>

              <p style="font-weight: 600; font-size: 14px; color: #374151;
                         margin: 0 0 12px;">
                Items ordered
              </p>
              ${OrderItemsTable(order.items)}

              <p style="font-weight: 600; font-size: 14px; color: #374151;
                         margin: 0 0 12px;">
                Deliver to
              </p>
              <div style="background: #f9fafb; border-radius: 10px;
                          padding: 14px 18px; margin-bottom: 24px;
                          font-size: 14px; color: #374151; line-height: 1.7;">
                ${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}<br>
                ${addr.city}, ${addr.state} — ${addr.pincode}<br>
                📞 ${addr.phone}
              </div>

              <a href="${APP_URL}/admin/orders" style="${styles.btn}">
                Manage order →
              </a>
            </div>
            <div style="${styles.footer}">
              <p style="${styles.footerText}">ShopNext Admin Notifications</p>
            </div>
          </div>
        </div>
      </body></html>
    `,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 6 — Admin: low stock alert
// ═══════════════════════════════════════════════════════════════════════════
export function lowStockEmail({ products }) {
  return {
    subject: `⚠️ Low stock alert — ${products.length} product${products.length !== 1 ? "s" : ""} need attention`,
    html: `
      <!DOCTYPE html>
      <html><body style="${styles.body}">
        <div style="${styles.wrapper}">
          <div style="${styles.card}">
            <div style="background: #111827; padding: 28px 32px;">
              <p style="${styles.logo}">ShopNext Admin</p>
              <p style="${styles.headerSub}">Stock alert</p>
            </div>
            <div style="${styles.body_inner}">
              <div style="font-size: 36px; margin-bottom: 16px;">⚠️</div>
              <h2 style="${styles.h2}">
                ${products.length} product${products.length !== 1 ? "s" : ""} running low
              </h2>
              <p style="${styles.p}">
                The following products need to be restocked to avoid going out of stock.
              </p>

              <table style="${styles.table}">
                <thead>
                  <tr>
                    <th style="${styles.th}">Product</th>
                    <th style="${styles.th}; text-align: center;">Stock</th>
                    <th style="${styles.th}; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${products
                    .map(
                      (p) => `
                    <tr>
                      <td style="${styles.td}">${p.name}</td>
                      <td style="${styles.td}; text-align: center; font-weight: 600;">
                        ${p.stock}
                      </td>
                      <td style="${styles.td}; text-align: center;">
                        <span style="${styles.badge(p.stock === 0 ? "#ef4444" : "#f59e0b")}">
                          ${p.stock === 0 ? "Out of stock" : "Low stock"}
                        </span>
                      </td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>

              <a href="${APP_URL}/admin/products" style="${styles.btn}">
                Update inventory →
              </a>
            </div>
            <div style="${styles.footer}">
              <p style="${styles.footerText}">ShopNext Admin Notifications</p>
            </div>
          </div>
        </div>
      </body></html>
    `,
  };
}

// ── Admin: new return request ─────────────────────────────────────────────
export function adminReturnRequestEmail({
  returnId,
  orderId,
  reason,
  items,
  refundAmount,
}) {
  return {
    subject: `↩ Return request #${returnId?.slice(0, 8).toUpperCase()} — ${formatPrice(refundAmount)}`,
    html: `
      <!DOCTYPE html>
      <html><body style="${styles.body}">
        <div style="${styles.wrapper}">
          <div style="${styles.card}">
            <div style="background:#111827;padding:28px 32px;">
              <p style="${styles.logo}">ShopNext Admin</p>
              <p style="${styles.headerSub}">New return request received</p>
            </div>
            <div style="${styles.body_inner}">
              <h2 style="${styles.h2}">Return Request #${returnId?.slice(0, 8).toUpperCase()}</h2>
              <p style="${styles.p}">
                Order <strong>#${orderId?.slice(0, 8).toUpperCase()}</strong>
                · Reason: <strong>${reason}</strong>
              </p>
              ${OrderItemsTable(items.map((i) => ({ ...i, quantity: i.returnQty })))}
              <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;color:#6b7280;">Refund amount</p>
                <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#4f46e5;">
                  ${formatPrice(refundAmount)}
                </p>
              </div>
              <a href="${APP_URL}/admin/returns" style="${styles.btn}">
                Review request →
              </a>
            </div>
          </div>
        </div>
      </body></html>
    `,
  };
}

// ── Customer: return status update ────────────────────────────────────────
export function returnStatusEmail({
  status,
  adminNote,
  returnId,
  orderId,
  refundAmount,
}) {
  const isApproved = status === "approved" || status === "refunded";
  const isRefunded = status === "refunded";

  return {
    subject: isRefunded
      ? `✅ Refund processed for your return request`
      : isApproved
        ? `✅ Return request approved — refund coming soon`
        : `❌ Return request update`,
    html: `
      <!DOCTYPE html>
      <html><body style="${styles.body}">
        <div style="${styles.wrapper}">
          <div style="${styles.card}">
            ${Header("Return request update")}
            <div style="${styles.body_inner}">
              <div style="font-size:40px;margin-bottom:16px;">
                ${isRefunded ? "💰" : isApproved ? "✅" : "❌"}
              </div>
              <h2 style="${styles.h2}">
                ${
                  isRefunded
                    ? "Refund has been processed!"
                    : isApproved
                      ? "Return request approved!"
                      : "Return request update"
                }
              </h2>
              <p style="${styles.p}">
                Return request <strong>#${returnId?.slice(0, 8).toUpperCase()}</strong>
                for Order <strong>#${orderId?.slice(0, 8).toUpperCase()}</strong>
                ${
                  isRefunded
                    ? `— your refund of <strong>${formatPrice(refundAmount)}</strong> has been processed.`
                    : isApproved
                      ? `has been <strong>approved</strong>.`
                      : `has been <strong>rejected</strong>.`
                }
              </p>
              ${
                adminNote
                  ? `
                <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">
                    Message from our team
                  </p>
                  <p style="margin:8px 0 0;font-size:14px;color:#374151;">${adminNote}</p>
                </div>
              `
                  : ""
              }
              ${
                isApproved && !isRefunded
                  ? `
                <p style="${styles.p}">
                  Your refund of <strong>${formatPrice(refundAmount)}</strong>
                  will be credited within 5–7 business days.
                </p>
              `
                  : ""
              }
              <a href="${APP_URL}/orders/${orderId}" style="${styles.btn}">
                View order →
              </a>
            </div>
            ${Footer()}
          </div>
        </div>
      </body></html>
    `,
  };
}

// ── Unified getter — used by the API route ─────────────────────
export function getEmailTemplate(type, data) {
  switch (type) {
    case "welcome":
      return welcomeEmail(data);
    case "order_confirmed":
      return orderConfirmedEmail(data);
    case "order_status":
      return orderStatusEmail(data);
    case "payment_failed":
      return paymentFailedEmail(data);
    case "admin_new_order":
      return adminNewOrderEmail(data);
    case "low_stock":
      return lowStockEmail(data);
    case "admin_return_request":
      return adminReturnRequestEmail(data);
    case "return_status":
      return returnStatusEmail(data);
    default:
      return null;
  }
}
