import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { parse as parseCookie, serialize } from "cookie";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { z } from "zod";

const SESSION_COOKIE = "accountant_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
const OTP_MAX_AGE_MS = 10 * 60 * 1000;
const RESET_MAX_AGE_MS = 30 * 60 * 1000;

let cachedClient = globalThis.__accountantMongoClient;
let cachedDb = globalThis.__accountantMongoDb;

function env(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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
    serialize(SESSION_COOKIE, token, {
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
    serialize(SESSION_COOKIE, "", {
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
    companyName: "Accountant Invoice",
    companyEmail: adminEmail,
    companyPhone: "",
    companyAddress: "",
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

function getTransporter() {
  return nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT")),
    secure: Number(env("SMTP_PORT")) === 465,
    auth: {
      user: env("SMTP_USER"),
      pass: env("SMTP_PASS"),
    },
  });
}

async function sendMail({ to, subject, html, text }) {
  await getTransporter().sendMail({
    from: env("SMTP_FROM"),
    to,
    subject,
    html,
    text,
  });
}

async function sendOtpEmail(email, otp, purpose) {
  await sendMail({
    to: email,
    subject: `Accountant Invoice ${purpose} OTP`,
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your Accountant Invoice OTP is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`,
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  await sendMail({
    to: email,
    subject: "Reset your Accountant Invoice password",
    text: `Reset your password: ${resetUrl}`,
    html: `<p>Use the link below to reset your password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}

async function sendInvoiceCreatedEmail(invoice, downloadUrl) {
  await sendMail({
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from Accountant Invoice`,
    text: `Invoice ${invoice.invoiceNumber} total: ${invoice.total}. Download: ${downloadUrl}`,
    html: `
      <p>Hello ${invoice.clientName || "there"},</p>
      <p>Your invoice <strong>${invoice.invoiceNumber}</strong> is ready.</p>
      <p>Total amount: <strong>₹${Number(invoice.total || 0).toFixed(2)}</strong></p>
      <p>Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}</p>
      <p><a href="${downloadUrl}">Download invoice</a></p>
    `,
  });
}

function serializeInvoice(doc) {
  return {
    ...doc,
    id: doc._id.toString(),
    _id: undefined,
    publicDownloadTokenHash: undefined,
  };
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
  const taxRate = Number(input.tax ?? input.igst ?? 0) + Number(input.cgst ?? 0) + Number(input.sgst ?? 0);
  const tax = input.taxAmount !== undefined ? Number(input.taxAmount) : (subtotal * taxRate) / 100;
  const discountRate = Number(input.discountRate ?? 0);
  const discount = input.discount !== undefined ? Number(input.discount) : (subtotal * discountRate) / 100;
  const total = Math.max(subtotal + tax - discount, 0);
  const amountPaid = Math.min(Number(input.amountPaid || 0), total);
  const amountDue = Math.max(total - amountPaid, 0);

  let status = input.status || "draft";
  if (amountDue === 0 && total > 0) status = "paid";
  else if (amountPaid > 0 && amountDue > 0) status = "partially_paid";

  return {
    items: normalizedItems,
    subtotal,
    tax,
    discount,
    total,
    amountPaid,
    amountDue,
    status,
  };
}

async function nextInvoiceNumber(db) {
  const settings = await ensureSettings(db, (await ensureAdminSeeded()).email);
  const count = await db.collection("invoices").countDocuments({});
  return `${settings.invoicePrefix || "INV"}-${String(count + 1).padStart(6, "0")}`;
}

async function upsertInvoiceTransaction(db, invoice) {
  if (!invoice.amountPaid || invoice.amountPaid <= 0) return;

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
      await db.collection("otp_tokens").insertOne({
        adminId: admin._id,
        type: "login",
        email: admin.email,
        otpHash: await bcrypt.hash(otp, 12),
        expiresAt: new Date(Date.now() + OTP_MAX_AGE_MS),
        consumedAt: null,
        createdAt: new Date(),
      });
      await sendOtpEmail(admin.email, otp, "login");
      return json(res, 200, { success: true, requiresOtp: true });
    }

    setSessionCookie(res, admin);
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
    const invoices = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return json(res, 200, { invoices: invoices.map(serializeInvoice) });
  }

  if (req.method === "POST" && !id) {
    const body = z.object({
      clientName: z.string().min(1),
      clientEmail: z.string().email().optional().or(z.literal("")),
      clientPhone: z.string().optional(),
      billingAddress: z.string().optional(),
      clientAddress: z.string().optional(),
      items: z.array(z.any()).min(1),
    }).passthrough().parse(await readBody(req));
    const now = new Date();
    const token = generateToken();
    const calculated = calculateInvoice(body);
    const invoice = {
      ...body,
      ...calculated,
      invoiceNumber: body.invoiceNumber || await nextInvoiceNumber(db),
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
    if (saved.clientEmail) {
      const downloadUrl = `${env("APP_BASE_URL")}/invoice-download/${token}`;
      await sendInvoiceCreatedEmail(saved, downloadUrl);
      await collection.updateOne({ _id: result.insertedId }, { $set: { emailSentAt: new Date() } });
      saved.emailSentAt = new Date();
    }
    return json(res, 201, { invoice: serializeInvoice(saved), publicDownloadToken: token });
  }

  if (!ObjectId.isValid(id)) return json(res, 400, { error: "Invalid invoice id" });
  const _id = new ObjectId(id);

  if (req.method === "GET") {
    const invoice = await collection.findOne({ _id });
    if (!invoice) return json(res, 404, { error: "Invoice not found" });
    return json(res, 200, { invoice: serializeInvoice(invoice) });
  }

  if (req.method === "PATCH") {
    const existing = await collection.findOne({ _id });
    if (!existing) return json(res, 404, { error: "Invoice not found" });
    const body = await readBody(req);
    const merged = { ...existing, ...body };
    const calculated = calculateInvoice(merged);
    const update = { ...body, ...calculated, updatedAt: new Date() };
    await collection.updateOne({ _id }, { $set: update });
    const invoice = await collection.findOne({ _id });
    await upsertInvoiceTransaction(db, invoice);
    return json(res, 200, { invoice: serializeInvoice(invoice) });
  }

  if (req.method === "DELETE") {
    await collection.deleteOne({ _id });
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

  const [invoices, transactions] = await Promise.all([
    db.collection("invoices").find({}).sort({ createdAt: -1 }).toArray(),
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
  for (const invoice of invoices) statusMap[invoice.status] = (statusMap[invoice.status] || 0) + 1;

  return json(res, 200, {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter((invoice) => invoice.status === "paid").length,
    unpaidInvoices: invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled").length,
    overdueInvoices: invoices.filter((invoice) => invoice.status === "overdue").length,
    amountDue,
    monthlyRevenue: Object.values(monthlyMap).map((row) => ({ month: row.month, amount: row.revenue })),
    monthlyExpenses: Object.values(monthlyMap).map((row) => ({ month: row.month, amount: row.expenses })),
    recentTransactions: transactions.slice(0, 5).map((tx) => ({ ...tx, id: tx._id.toString(), _id: undefined })),
    recentInvoices: invoices.slice(0, 5).map(serializeInvoice),
    invoiceStatusBreakdown: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
  });
}

async function handlePublic(req, res, parts) {
  const db = await getDb();
  if (req.method !== "GET" || parts[1] !== "invoices" || !parts[2]) return json(res, 404, { error: "Not found" });
  const invoice = await db.collection("invoices").findOne({
    publicDownloadTokenHash: hashToken(parts[2]),
    publicDownloadEnabled: true,
  });
  if (!invoice) return json(res, 404, { error: "Invoice not found" });
  const settings = await ensureSettings(db, "");
  return json(res, 200, {
    invoice: serializeInvoice(invoice),
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
    if (root === "public") return await handlePublic(req, res, path);
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(res, 400, { error: "Validation failed", details: error.flatten() });
    }
    const status = error.statusCode || 500;
    return json(res, status, { error: status === 500 ? "Internal server error" : error.message });
  }
}
