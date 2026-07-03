import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";

const SESSION_COOKIE = "accountant_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
const OTP_MAX_AGE_MS = 10 * 60 * 1000;
const RESET_MAX_AGE_MS = 30 * 60 * 1000;
const APP_NAME = "Ramesh Tyres";

let cachedClient = globalThis.__accountantMongoClient;
let cachedDb = globalThis.__accountantMongoDb;

function parseCookie(header) {
  return String(header || "")
    .split(";")
    .reduce((cookies, part) => {
      const index = part.indexOf("=");
      if (index === -1) return cookies;
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (key) cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

function env(name) {
  const value = process.env[name];
  if (!value) {
    throw Object.assign(new Error(`Server misconfigured: missing ${name}`), {
      statusCode: 500,
      exposeToClient: true,
    });
  }
  return value;
}

function optionalEnv(name) {
  return process.env[name] || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function emailLayout({ title, preheader, intro, rows = [], button, footer }) {
  const rowHtml = rows
    .filter((row) => row?.label)
    .map((row) => `
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px;border-bottom:1px solid #e5e7eb;">${escapeHtml(row.label)}</td>
        <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb;">${escapeHtml(row.value || "N/A")}</td>
      </tr>
    `)
    .join("");

  const buttonHtml = button?.href
    ? `<div style="margin:28px 0 6px;">
        <a href="${escapeHtml(button.href)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 20px;border-radius:4px;">${escapeHtml(button.label || "Open")}</a>
      </div>`
    : "";

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader || title)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">
                <tr>
                  <td style="background:#111827;color:#ffffff;padding:22px 26px;">
                    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#cbd5e1;">${APP_NAME}</div>
                    <div style="font-size:24px;font-weight:800;line-height:1.25;margin-top:7px;">${escapeHtml(title)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:26px;">
                    <div style="font-size:15px;line-height:1.7;color:#374151;">${intro || ""}</div>
                    ${rowHtml ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-top:1px solid #e5e7eb;">${rowHtml}</table>` : ""}
                    ${buttonHtml}
                    <p style="margin:22px 0 0;color:#64748b;font-size:12px;line-height:1.6;">${escapeHtml(footer || "This is an automated email. Please do not share secure links or OTPs with anyone.")}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(value || req.headers["x-real-ip"] || req.socket?.remoteAddress || "Unknown").split(",")[0].trim();
}

function getBrowserInfo(req) {
  const ua = String(req.headers["user-agent"] || "Unknown");
  const browser =
    ua.includes("Edg/") ? "Microsoft Edge" :
    ua.includes("Chrome/") ? "Chrome" :
    ua.includes("Firefox/") ? "Firefox" :
    ua.includes("Safari/") ? "Safari" :
    "Unknown browser";
  const device =
    /Mobile|Android|iPhone|iPad/i.test(ua) ? "Mobile / Tablet" :
    ua === "Unknown" ? "Unknown device" :
    "Desktop";
  return { userAgent: ua, browser, device };
}

async function getDb() {
  if (cachedDb) return cachedDb;

  const uri = env("MONGODB_URI");
  cachedClient = cachedClient || new MongoClient(uri);
  if (!globalThis.__accountantMongoClient) {
    await cachedClient.connect();
    globalThis.__accountantMongoClient = cachedClient;
  }
  
  const dbName = new URL(uri).pathname.replace("/", "") || "accountant_invoice";
  cachedDb = cachedClient.db(dbName);
  globalThis.__accountantMongoDb = cachedDb;
  return cachedDb;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }
}

function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function setSessionCookie(res, admin) {
  const token = jwt.sign(
    { sub: admin._id.toString(), type: "admin" },
    env("JWT_SECRET"),
    { expiresIn: SESSION_MAX_AGE_SECONDS }
  );
  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
  );
}

async function getSession(req) {
  const cookies = parseCookie(req.headers.cookie || "");
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, env("JWT_SECRET"));
  } catch {
    return null;
  }
}

async function requireAuth(req) {
  const session = await getSession(req);
  if (!session?.sub) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }

  const db = await getDb();
  const admin = await db.collection("admins").findOne({ _id: new ObjectId(session.sub) });
  if (!admin) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return admin;
}

function publicAdmin(admin) {
  return {
    id: admin._id.toString(),
    email: admin.email,
    loginOtpEnabled: Boolean(admin.loginOtpEnabled),
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

async function ensureSettings(db, adminEmail) {
  const existing = await db.collection("settings").findOne({});
  if (existing) return existing;

  const now = new Date();
  const settings = {
    companyName: APP_NAME,
    companyEmail: adminEmail,
    companyPhone: "",
    companyAddress: "",
    companyPanNumber: "",
    companyGstNumber: "",
    logoUrl: "",
    currency: "INR",
    invoicePrefix: "INV",
    loginOtpEnabled: false,
    updatedAt: now,
  };
  const result = await db.collection("settings").insertOne(settings);
  return { _id: result.insertedId, ...settings };
}

async function ensureAdminSeeded() {
  const db = await getDb();
  const admins = db.collection("admins");
  const existing = await admins.findOne({});
  if (existing) {
    await ensureSettings(db, existing.email);
    return existing;
  }

  const email = env("ADMIN_EMAIL").toLowerCase();
  const password = env("ADMIN_INITIAL_PASSWORD");
  if (password.length < 8) {
    throw Object.assign(new Error("ADMIN_INITIAL_PASSWORD must be at least 8 characters"), { statusCode: 500 });
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = {
    email,
    passwordHash,
    loginOtpEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
  const result = await admins.insertOne(admin);
  const created = { _id: result.insertedId, ...admin };
  await ensureSettings(db, email);
  return created;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function sendMail({ to, subject, html, text }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env("BREVO_API_KEY"),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: env("BREVO_FROM_EMAIL"),
        name: optionalEnv("BREVO_FROM_NAME") || APP_NAME,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw Object.assign(new Error(`Brevo email failed (${response.status})${detail ? `: ${detail}` : ""}`), { statusCode: 502 });
  }
}

async function sendOtpEmail(email, otp, purpose) {
  const title = `${purpose.charAt(0).toUpperCase()}${purpose.slice(1)} OTP`;
  await sendMail({
    to: email,
    subject: `${APP_NAME} ${title}`,
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    html: emailLayout({
      title,
      preheader: `Your ${APP_NAME} OTP is ${otp}`,
      intro: `<p style="margin:0;">Use this one-time password to complete your ${escapeHtml(purpose)} request.</p>
        <div style="margin-top:20px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:4px;padding:18px;text-align:center;">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">Verification Code</div>
          <div style="font-size:30px;font-weight:800;letter-spacing:.22em;margin-top:6px;color:#111827;">${escapeHtml(otp)}</div>
        </div>`,
      rows: [
        { label: "Expires in", value: "10 minutes" },
        { label: "Purpose", value: purpose },
      ],
      footer: "If you did not request this code, secure your admin password immediately.",
    }),
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  await sendMail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    text: `Reset your password: ${resetUrl}`,
    html: emailLayout({
      title: "Reset your password",
      preheader: "Password reset link valid for 30 minutes",
      intro: `<p style="margin:0;">We received a request to reset your admin password. Use the secure button below to continue.</p>`,
      rows: [
        { label: "Expires in", value: "30 minutes" },
        { label: "Account", value: email },
      ],
      button: { href: resetUrl, label: "Reset Password" },
      footer: "If you did not request this reset, ignore this email and keep your current password.",
    }),
  });
}

async function sendInvoiceCreatedEmail(invoice, downloadUrl) {
  const currency = invoice.currency || "INR";
  const amount = `${currency} ${Number(invoice.total || 0).toFixed(2)}`;
  await sendMail({
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from ${invoice.companyName || APP_NAME}`,
    text: `Invoice ${invoice.invoiceNumber} total: ${amount}. Download: ${downloadUrl}`,
    html: emailLayout({
      title: `Invoice ${invoice.invoiceNumber}`,
      preheader: `Invoice total ${amount}`,
      intro: `<p style="margin:0;">Hello ${escapeHtml(invoice.clientName || "there")},</p>
        <p style="margin:12px 0 0;">Your invoice from <strong>${escapeHtml(invoice.companyName || APP_NAME)}</strong> is ready. You can preview and download it using the button below.</p>`,
      rows: [
        { label: "Invoice Number", value: invoice.invoiceNumber },
        { label: "Total Amount", value: amount },
        { label: "Status", value: invoice.status || "pending" },
        { label: "Due Date", value: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "N/A" },
      ],
      button: { href: downloadUrl, label: "View / Download Invoice" },
      footer: "This public invoice link opens without login. Keep it only with the intended recipient.",
    }),
  });
}

async function sendLoginAlertEmail(admin, req) {
  const info = getBrowserInfo(req);
  const ip = getClientIp(req);
  const time = formatDateTime();
  await sendMail({
    to: admin.email,
    subject: `${APP_NAME} admin login alert`,
    text: `Admin login detected. Time: ${time}. IP: ${ip}. Browser: ${info.browser}. Device: ${info.device}. User agent: ${info.userAgent}`,
    html: emailLayout({
      title: "Admin login detected",
      preheader: `New admin login from ${info.browser}`,
      intro: `<p style="margin:0;">A successful admin login was detected for your ${APP_NAME} account.</p>`,
      rows: [
        { label: "Login time", value: time },
        { label: "IP address", value: ip },
        { label: "Browser", value: info.browser },
        { label: "Device", value: info.device },
        { label: "Admin email", value: admin.email },
        { label: "User agent", value: info.userAgent },
      ],
      button: { href: `${optionalEnv("APP_BASE_URL") || ""}/profile`, label: "Review Security Settings" },
      footer: "If this login was not yours, change the admin password immediately and review OTP settings.",
    }),
  });
}

function serializeInvoice(doc) {
  const status = doc.status === "paid" || doc.status === "overdue" ? doc.status : "pending";
  return {
    ...doc,
    status,
    id: doc._id.toString(),
    _id: undefined,
    publicDownloadTokenHash: undefined,
  };
}

function serializeNotification(doc) {
  return {
    ...doc,
    id: doc._id.toString(),
    _id: undefined,
  };
}

async function createNotification(db, input) {
  const now = new Date();
  await db.collection("notifications").insertOne({
    type: input.type || "info",
    title: input.title,
    message: input.message,
    entityType: input.entityType || "",
    entityId: input.entityId || null,
    href: input.href || "",
    readAt: null,
    createdAt: now,
  });
}

function calculateInvoice(input) {
  const items = Array.isArray(input.items) ? input.items : [];
  const normalizedItems = items.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    return {
      id: item.id || `item-${index + 1}`,
      description: item.description || "",
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
  const igst = Number(input.igst || 0);
  const cgst = Number(input.cgst || 0);
  const sgst = Number(input.sgst || 0);
  const igstAmount = (subtotal * igst) / 100;
  const cgstAmount = (subtotal * cgst) / 100;
  const sgstAmount = (subtotal * sgst) / 100;
  const tax = igstAmount + cgstAmount + sgstAmount;
  const discountRate = Number(input.discountRate ?? 0);
  const discount = (subtotal * discountRate) / 100;
  const total = Math.max(subtotal + tax - discount, 0);
  const requestedStatus = ["pending", "paid", "overdue"].includes(input.status) ? input.status : "pending";
  const amountPaid = requestedStatus === "paid" ? total : Math.min(Number(input.amountPaid || 0), total);
  const amountDue = Math.max(total - amountPaid, 0);

  let status = requestedStatus === "paid" || amountDue === 0 && total > 0 ? "paid" : "pending";
  if (
    amountDue > 0 &&
    input.dueDate &&
    new Date(input.dueDate) < new Date()
  ) {
    status = "overdue";
  }

  return {
    items: normalizedItems,
    subtotal,
    tax,
    igst,
    cgst,
    sgst,
    igstAmount,
    cgstAmount,
    sgstAmount,
    discount,
    discountAmount: discount,
    total,
    amountPaid,
    amountDue,
    status,
  };
}

async function markOverdueInvoices(db) {
  const now = new Date();
  const overdue = await db.collection("invoices").find({
    status: { $nin: ["paid", "overdue"] },
    amountDue: { $gt: 0 },
    dueDate: { $nin: ["", null] },
    deletedAt: { $exists: false },
  }).toArray();

  for (const invoice of overdue) {
    if (new Date(invoice.dueDate) >= now) continue;
    await db.collection("invoices").updateOne(
      { _id: invoice._id },
      { $set: { status: "overdue", overdueNotifiedAt: invoice.overdueNotifiedAt || now, updatedAt: now } }
    );
    if (!invoice.overdueNotifiedAt) {
      await createNotification(db, {
        type: "warning",
        title: "Invoice overdue",
        message: `Invoice ${invoice.invoiceNumber} for ${invoice.clientName} is overdue.`,
        entityType: "invoice",
        entityId: invoice._id,
        href: `/invoices/${invoice._id.toString()}`,
      });
    }
  }
}

async function nextInvoiceNumber(db) {
  const settings = await ensureSettings(db, (await ensureAdminSeeded()).email);
  const count = await db.collection("invoices").countDocuments({});
  return `${settings.invoicePrefix || "INV"}-${String(count + 1).padStart(6, "0")}`;
}

async function upsertInvoiceTransaction(db, invoice) {
  if (!invoice.amountPaid || invoice.amountPaid <= 0) {
    await db.collection("transactions").deleteOne({ source: "invoice", invoiceId: invoice._id });
    return;
  }

  const now = new Date();
  await db.collection("transactions").updateOne(
    { source: "invoice", invoiceId: invoice._id },
    {
      $set: {
        type: "income",
        source: "invoice",
        invoiceId: invoice._id,
        title: `Invoice ${invoice.invoiceNumber}`,
        description: `Payment from ${invoice.clientName}`,
        amount: invoice.amountPaid,
        paymentMethod: invoice.paymentMethod || invoice.paymentMode || "",
        transactionDate: invoice.updatedAt || now,
        category: "Invoice Payment",
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
}

async function handleAuth(req, res, parts) {
  const action = parts[1];

  if (req.method === "POST" && action === "login") {
    const body = z.object({ password: z.string().min(1) }).parse(await readBody(req));
    const admin = await ensureAdminSeeded();
    const ok = await bcrypt.compare(body.password, admin.passwordHash);
    if (!ok) return json(res, 401, { error: "Invalid password" });

    if (admin.loginOtpEnabled) {
      const db = await getDb();
      const otp = generateOtp();
      const otpResult = await db.collection("otp_tokens").insertOne({
        adminId: admin._id,
        type: "login",
        email: admin.email,
        otpHash: await bcrypt.hash(otp, 12),
        expiresAt: new Date(Date.now() + OTP_MAX_AGE_MS),
        consumedAt: null,
        createdAt: new Date(),
      });
      try {
        await sendOtpEmail(admin.email, otp, "login");
      } catch (error) {
        console.error("Login OTP email failed", error);
        await db.collection("otp_tokens").updateOne({ _id: otpResult.insertedId }, { $set: { consumedAt: new Date() } }).catch(() => {});
        throw Object.assign(new Error("Login OTP email failed."), {
          statusCode: 503,
          exposeToClient: true,
        });
      }
      return json(res, 200, { success: true, requiresOtp: true });
    }

    setSessionCookie(res, admin);
    const db = await getDb();
    await sendLoginAlertEmail(admin, req).catch((error) => {
      console.error("Login alert email failed", error);
    });
    await createNotification(db, {
      type: "success",
      title: "Admin login",
      message: "Admin signed in successfully.",
      href: "/profile",
    }).catch((error) => {
      console.error("Login notification failed", error);
    });
    return json(res, 200, { success: true, admin: publicAdmin(admin) });
  }

  if (req.method === "POST" && action === "verify-login-otp") {
    const db = await getDb();
    const body = z.object({ otp: z.string().min(4) }).parse(await readBody(req));
    const admin = await ensureAdminSeeded();
    const latest = await db.collection("otp_tokens").findOne(
      { adminId: admin._id, type: "login", consumedAt: null, expiresAt: { $gt: new Date() } },
      { sort: { createdAt: -1 } }
    );
    if (!latest || !(await bcrypt.compare(body.otp, latest.otpHash))) {
      return json(res, 400, { error: "Invalid or expired OTP" });
    }
    await db.collection("otp_tokens").updateOne({ _id: latest._id }, { $set: { consumedAt: new Date() } });
    setSessionCookie(res, admin);
    await sendLoginAlertEmail(admin, req).catch((error) => {
      console.error("Login alert email failed", error);
    });
    return json(res, 200, { success: true, admin: publicAdmin(admin) });
  }

  if (req.method === "POST" && action === "logout") {
    clearSessionCookie(res);
    return json(res, 200, { success: true });
  }

  if (req.method === "GET" && action === "me") {
    const admin = await requireAuth(req);
    const db = await getDb();
    const settings = await ensureSettings(db, admin.email);
    return json(res, 200, { admin: publicAdmin(admin), settings });
  }

  if (req.method === "POST" && action === "request-password-reset") {
    const db = await getDb();
    const admin = await ensureAdminSeeded();
    const token = generateToken();
    await db.collection("password_reset_tokens").insertOne({
      adminId: admin._id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_MAX_AGE_MS),
      consumedAt: null,
      createdAt: new Date(),
    });
    await sendPasswordResetEmail(admin.email, `${env("APP_BASE_URL")}/reset-password?token=${token}`);
    return json(res, 200, { success: true });
  }

  if (req.method === "POST" && action === "reset-password") {
    const db = await getDb();
    const body = z.object({ token: z.string().min(16), newPassword: z.string().min(8) }).parse(await readBody(req));
    const tokenHash = hashToken(body.token);
    const reset = await db.collection("password_reset_tokens").findOne({
      tokenHash,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!reset) return json(res, 400, { error: "Invalid or expired reset token" });
    await db.collection("admins").updateOne(
      { _id: reset.adminId },
      { $set: { passwordHash: await bcrypt.hash(body.newPassword, 12), updatedAt: new Date() } }
    );
    await db.collection("password_reset_tokens").updateOne({ _id: reset._id }, { $set: { consumedAt: new Date() } });
    clearSessionCookie(res);
    return json(res, 200, { success: true });
  }

  if (req.method === "POST" && action === "change-password") {
    const admin = await requireAuth(req);
    const body = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }).parse(await readBody(req));
    const ok = await bcrypt.compare(body.currentPassword, admin.passwordHash);
    if (!ok) return json(res, 400, { error: "Current password is incorrect" });
    await db.collection("admins").updateOne(
      { _id: admin._id },
      { $set: { passwordHash: await bcrypt.hash(body.newPassword, 12), updatedAt: new Date() } }
    );
    return json(res, 200, { success: true });
  }

  return json(res, 404, { error: "Not found" });
}

async function handleSettings(req, res, parts) {
  const admin = await requireAuth(req);
  const db = await getDb();
  const settings = await ensureSettings(db, admin.email);
  const action = parts[1];

  if (req.method === "GET" && !action) return json(res, 200, { settings });

  if (req.method === "PATCH" && !action) {
    const body = z.object({
      companyName: z.string().optional(),
      companyEmail: z.string().email().optional(),
      companyPhone: z.string().optional(),
      companyAddress: z.string().optional(),
      companyPanNumber: z.string().optional(),
      companyGstNumber: z.string().optional(),
      logoUrl: z.string().optional(),
      currency: z.string().optional(),
      invoicePrefix: z.string().optional(),
    }).parse(await readBody(req));
    await db.collection("settings").updateOne({ _id: settings._id }, { $set: { ...body, updatedAt: new Date() } });
    return json(res, 200, { success: true });
  }

  if (req.method === "PATCH" && action === "security") {
    const body = z.object({ loginOtpEnabled: z.boolean() }).parse(await readBody(req));
    await db.collection("admins").updateOne({ _id: admin._id }, { $set: { loginOtpEnabled: body.loginOtpEnabled, updatedAt: new Date() } });
    await db.collection("settings").updateOne({ _id: settings._id }, { $set: { loginOtpEnabled: body.loginOtpEnabled, updatedAt: new Date() } });
    return json(res, 200, { success: true });
  }

  if (req.method === "POST" && action === "request-email-change") {
    const body = z.object({ newEmail: z.string().email() }).parse(await readBody(req));
    const otp = generateOtp();
    await db.collection("otp_tokens").insertOne({
      adminId: admin._id,
      type: "email_change",
      email: body.newEmail.toLowerCase(),
      otpHash: await bcrypt.hash(otp, 12),
      expiresAt: new Date(Date.now() + OTP_MAX_AGE_MS),
      consumedAt: null,
      createdAt: new Date(),
    });
    await sendOtpEmail(body.newEmail, otp, "email change");
    return json(res, 200, { success: true });
  }

  if (req.method === "POST" && action === "verify-email-change") {
    const body = z.object({ newEmail: z.string().email(), otp: z.string().min(4) }).parse(await readBody(req));
    const token = await db.collection("otp_tokens").findOne(
      { adminId: admin._id, type: "email_change", email: body.newEmail.toLowerCase(), consumedAt: null, expiresAt: { $gt: new Date() } },
      { sort: { createdAt: -1 } }
    );
    if (!token || !(await bcrypt.compare(body.otp, token.otpHash))) {
      return json(res, 400, { error: "Invalid or expired OTP" });
    }
    await db.collection("admins").updateOne({ _id: admin._id }, { $set: { email: body.newEmail.toLowerCase(), updatedAt: new Date() } });
    await db.collection("settings").updateOne({ _id: settings._id }, { $set: { companyEmail: body.newEmail.toLowerCase(), updatedAt: new Date() } });
    await db.collection("otp_tokens").updateOne({ _id: token._id }, { $set: { consumedAt: new Date() } });
    return json(res, 200, { success: true });
  }

  return json(res, 404, { error: "Not found" });
}

async function handleInvoices(req, res, parts) {
  await requireAuth(req);
  const db = await getDb();
  const id = parts[1];
  const collection = db.collection("invoices");

  if (req.method === "GET" && !id) {
    await markOverdueInvoices(db);
    const invoices = await collection.find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray();
    return json(res, 200, { invoices: invoices.map(serializeInvoice) });
  }

  if (req.method === "GET" && id === "deleted") {
    const invoices = await collection.find({ deletedAt: { $exists: true } }).sort({ deletedAt: -1 }).toArray();
    return json(res, 200, { invoices: invoices.map(serializeInvoice) });
  }

  if (req.method === "POST" && !id) {
    const settings = await ensureSettings(db, (await ensureAdminSeeded()).email);
    const body = z.object({
      clientName: z.string().min(1),
      clientEmail: z.string().email().optional().or(z.literal("")),
      clientPhone: z.string().optional(),
      billingAddress: z.string().optional(),
      clientAddress: z.string().optional(),
      items: z.array(z.any()).min(1),
    }).passthrough().parse(await readBody(req));
    if (!["pending", "paid"].includes(body.status || "pending")) {
      return json(res, 400, { error: "Invoice status must be pending or paid" });
    }
    if ((body.status || "pending") === "pending" && !body.dueDate) {
      return json(res, 400, { error: "Due date is required for pending invoices" });
    }
    const now = new Date();
    const token = generateToken();
    const calculated = calculateInvoice(body);
    const invoice = {
      ...body,
      ...calculated,
      invoiceNumber: body.invoiceNumber || await nextInvoiceNumber(db),
      currency: body.currency || settings.currency || "INR",
      clientEmail: body.clientEmail || "",
      billingAddress: body.billingAddress || body.clientAddress || "",
      issueDate: body.issueDate || body.createdAt || now.toISOString(),
      dueDate: body.dueDate || "",
      terms: body.terms || "",
      publicDownloadTokenHash: hashToken(token),
      publicDownloadEnabled: true,
      emailSentAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await collection.insertOne(invoice);
    const saved = { _id: result.insertedId, ...invoice };
    if (saved.amountPaid > 0) await upsertInvoiceTransaction(db, saved);
    await createNotification(db, {
      type: "info",
      title: "Invoice created",
      message: `Invoice ${saved.invoiceNumber} for ${saved.clientName} was created.`,
      entityType: "invoice",
      entityId: result.insertedId,
      href: `/invoices/${result.insertedId.toString()}`,
    });
    if (saved.clientEmail) {
      try {
        const downloadUrl = `${optionalEnv("APP_BASE_URL") || "http://localhost:5173"}/invoice-download/${token}`;
        await sendInvoiceCreatedEmail(saved, downloadUrl);
        await collection.updateOne({ _id: result.insertedId }, { $set: { emailSentAt: new Date() } });
        saved.emailSentAt = new Date();
      } catch (error) {
        console.error("Invoice email failed", error);
        await createNotification(db, {
          type: "warning",
          title: "Invoice email failed",
          message: `Invoice ${saved.invoiceNumber} was created, but email could not be sent.`,
          entityType: "invoice",
          entityId: result.insertedId,
          href: `/invoices/${result.insertedId.toString()}`,
        });
      }
    }
    return json(res, 201, { invoice: serializeInvoice(saved), publicDownloadToken: token });
  }

  if (!ObjectId.isValid(id)) return json(res, 400, { error: "Invalid invoice id" });
  const _id = new ObjectId(id);

  if (req.method === "GET") {
    await markOverdueInvoices(db);
    const invoice = await collection.findOne({ _id, deletedAt: { $exists: false } });
    if (!invoice) return json(res, 404, { error: "Invoice not found" });
    return json(res, 200, { invoice: serializeInvoice(invoice) });
  }

  if (req.method === "PATCH") {
    const existing = await collection.findOne({ _id, deletedAt: { $exists: false } });
    if (!existing) return json(res, 404, { error: "Invoice not found" });
    const body = await readBody(req);
    if (body.status && body.status !== "paid") {
      return json(res, 400, { error: "Only pending or overdue invoices can be marked paid" });
    }
    if (existing.status === "paid" && body.status) {
      return json(res, 400, { error: "Paid invoice status cannot be changed" });
    }
    const merged = { ...existing, ...body };
    const calculated = calculateInvoice(merged);
    const update = { ...body, ...calculated, updatedAt: new Date() };
    await collection.updateOne({ _id }, { $set: update });
    const invoice = await collection.findOne({ _id });
    await upsertInvoiceTransaction(db, invoice);
    return json(res, 200, { invoice: serializeInvoice(invoice) });
  }

  if (req.method === "DELETE") {
    if (parts[2] === "permanent") {
      await collection.deleteOne({ _id, deletedAt: { $exists: true } });
      await db.collection("transactions").deleteMany({ source: "invoice", invoiceId: _id });
      return json(res, 200, { success: true });
    }
    await collection.updateOne({ _id }, { $set: { deletedAt: new Date(), updatedAt: new Date() } });
    await db.collection("transactions").deleteMany({ source: "invoice", invoiceId: _id });
    return json(res, 200, { success: true });
  }

  return json(res, 404, { error: "Not found" });
}

async function handleTransactions(req, res, parts) {
  await requireAuth(req);
  const db = await getDb();
  const id = parts[1];
  const collection = db.collection("transactions");

  if (req.method === "GET" && !id) {
    const query = {};
    if (req.query.type) query.type = req.query.type;
    if (req.query.category) query.category = req.query.category;
    if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod;
    if (req.query.from || req.query.to) {
      query.transactionDate = {};
      if (req.query.from) query.transactionDate.$gte = new Date(req.query.from);
      if (req.query.to) query.transactionDate.$lte = new Date(req.query.to);
    }
    const transactions = await collection.find(query).sort({ transactionDate: -1, createdAt: -1 }).toArray();
    return json(res, 200, { transactions: transactions.map((tx) => ({ ...tx, id: tx._id.toString(), _id: undefined })) });
  }

  if (req.method === "POST" && !id) {
    const body = z.object({
      type: z.enum(["income", "expense"]),
      title: z.string().min(1),
      amount: z.coerce.number().nonnegative(),
      description: z.string().optional(),
      paymentMethod: z.string().optional(),
      transactionDate: z.string().optional(),
      category: z.string().optional(),
    }).parse(await readBody(req));
    const now = new Date();
    const doc = { ...body, source: "manual", transactionDate: body.transactionDate ? new Date(body.transactionDate) : now, createdAt: now, updatedAt: now };
    const result = await collection.insertOne(doc);
    return json(res, 201, { transaction: { ...doc, id: result.insertedId.toString() } });
  }

  if (!ObjectId.isValid(id)) return json(res, 400, { error: "Invalid transaction id" });
  const _id = new ObjectId(id);

  if (req.method === "GET") {
    const tx = await collection.findOne({ _id });
    if (!tx) return json(res, 404, { error: "Transaction not found" });
    return json(res, 200, { transaction: { ...tx, id: tx._id.toString(), _id: undefined } });
  }

  if (req.method === "PATCH") {
    const existing = await collection.findOne({ _id });
    if (!existing) return json(res, 404, { error: "Transaction not found" });
    if (existing.source === "invoice") return json(res, 400, { error: "Update the linked invoice payment instead" });
    const body = await readBody(req);
    const update = { ...body, updatedAt: new Date() };
    if (body.transactionDate) update.transactionDate = new Date(body.transactionDate);
    await collection.updateOne({ _id }, { $set: update });
    const tx = await collection.findOne({ _id });
    return json(res, 200, { transaction: { ...tx, id: tx._id.toString(), _id: undefined } });
  }

  if (req.method === "DELETE") {
    const existing = await collection.findOne({ _id });
    if (!existing) return json(res, 404, { error: "Transaction not found" });
    if (existing.source === "invoice") return json(res, 400, { error: "Delete or update the linked invoice instead" });
    await collection.deleteOne({ _id });
    return json(res, 200, { success: true });
  }

  return json(res, 404, { error: "Not found" });
}

async function handleAnalytics(req, res, parts) {
  await requireAuth(req);
  const db = await getDb();
  if (req.method !== "GET" || parts[1] !== "summary") return json(res, 404, { error: "Not found" });
  await markOverdueInvoices(db);

  const [invoices, transactions] = await Promise.all([
    db.collection("invoices").find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray(),
    db.collection("transactions").find({}).sort({ transactionDate: -1, createdAt: -1 }).toArray(),
  ]);
  const totalRevenue = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalExpenses = transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const amountDue = invoices.reduce((sum, invoice) => sum + Number(invoice.amountDue || 0), 0);
  const monthlyMap = {};
  for (const tx of transactions) {
    const date = new Date(tx.transactionDate || tx.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] ||= { month: key, revenue: 0, expenses: 0 };
    if (tx.type === "income") monthlyMap[key].revenue += Number(tx.amount || 0);
    if (tx.type === "expense") monthlyMap[key].expenses += Number(tx.amount || 0);
  }
  const statusMap = {};
  for (const invoice of invoices) {
    const status = invoice.status === "paid" || invoice.status === "overdue" ? invoice.status : "pending";
    statusMap[status] = (statusMap[status] || 0) + 1;
  }
  const now = new Date();
  const overdueAlerts = invoices
    .filter((invoice) => invoice.status !== "paid" && invoice.dueDate && new Date(invoice.dueDate) < now)
    .slice(0, 8)
    .map((invoice) => ({
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      amountDue: Number(invoice.amountDue || 0),
      dueDate: invoice.dueDate,
      href: `/invoices/${invoice._id.toString()}`,
    }));
  const pendingAlerts = invoices
    .filter((invoice) => invoice.status !== "paid" && Number(invoice.amountDue || 0) > 0)
    .slice(0, 8)
    .map((invoice) => ({
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      amountDue: Number(invoice.amountDue || 0),
      status: invoice.status,
      href: `/invoices/${invoice._id.toString()}`,
    }));

  return json(res, 200, {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter((invoice) => invoice.status === "paid").length,
    unpaidInvoices: invoices.filter((invoice) => invoice.status !== "paid").length,
    overdueInvoices: invoices.filter((invoice) => invoice.status === "overdue").length,
    amountDue,
    monthlyRevenue: Object.values(monthlyMap).map((row) => ({ month: row.month, amount: row.revenue })),
    monthlyExpenses: Object.values(monthlyMap).map((row) => ({ month: row.month, amount: row.expenses })),
    recentTransactions: transactions.slice(0, 5).map((tx) => ({ ...tx, id: tx._id.toString(), _id: undefined })),
    recentInvoices: invoices.slice(0, 5).map(serializeInvoice),
    invoiceStatusBreakdown: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    pendingAlerts,
    overdueAlerts,
  });
}

async function handleNotifications(req, res, parts) {
  await requireAuth(req);
  const db = await getDb();
  const id = parts[1];
  const collection = db.collection("notifications");

  if (req.method === "GET" && !id) {
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const notifications = await collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
    const unreadCount = await collection.countDocuments({ readAt: null });
    return json(res, 200, { notifications: notifications.map(serializeNotification), unreadCount });
  }

  if (req.method === "GET" && id) {
    if (!ObjectId.isValid(id)) return json(res, 400, { error: "Invalid notification id" });
    const notification = await collection.findOne({ _id: new ObjectId(id) });
    if (!notification) return json(res, 404, { error: "Notification not found" });
    return json(res, 200, { notification: serializeNotification(notification) });
  }

  if (req.method === "PATCH" && id === "read-all") {
    await collection.updateMany({ readAt: null }, { $set: { readAt: new Date() } });
    return json(res, 200, { success: true });
  }

  if (req.method === "PATCH" && id) {
    if (!ObjectId.isValid(id)) return json(res, 400, { error: "Invalid notification id" });
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { readAt: new Date() } });
    const notification = await collection.findOne({ _id: new ObjectId(id) });
    return json(res, 200, { notification: serializeNotification(notification) });
  }

  return json(res, 404, { error: "Not found" });
}

async function handlePublic(req, res, parts) {
  const db = await getDb();
  if (req.method !== "GET" || parts[1] !== "invoices" || !parts[2]) return json(res, 404, { error: "Not found" });
  const invoice = await db.collection("invoices").findOne({
    publicDownloadTokenHash: hashToken(parts[2]),
    publicDownloadEnabled: true,
    deletedAt: { $exists: false },
  });
  if (!invoice) return json(res, 404, { error: "Invoice not found" });
  const settings = await ensureSettings(db, "");
  const serializedInvoice = serializeInvoice(invoice);
  return json(res, 200, {
    invoice: {
      ...serializedInvoice,
      currency: serializedInvoice.currency || settings.currency || "INR",
    },
    company: {
      companyName: settings.companyName,
      companyEmail: settings.companyEmail,
      companyPhone: settings.companyPhone,
      companyAddress: settings.companyAddress,
      currency: settings.currency,
    },
  });
}

export default async function handler(req, res) {
  try {
    const path = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
    const root = path[0];
    if (root === "auth") return await handleAuth(req, res, path);
    if (root === "settings") return await handleSettings(req, res, path);
    if (root === "invoices") return await handleInvoices(req, res, path);
    if (root === "transactions") return await handleTransactions(req, res, path);
    if (root === "analytics") return await handleAnalytics(req, res, path);
    if (root === "notifications") return await handleNotifications(req, res, path);
    if (root === "public") return await handlePublic(req, res, path);
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return json(res, 400, { error: "Validation failed", details: error.flatten() });
    }
    const status = error.statusCode || 500;
    const showMessage = error.exposeToClient || status !== 500 || !isProduction();
    return json(res, status, { error: showMessage ? error.message : "Internal server error" });
  }
}
