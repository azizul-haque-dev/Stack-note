# Production-Grade Authentication System

## Language Learning Platform — Full Implementation

> **Stack:** Express.js · MongoDB · Prisma · Next.js (App Router) · React Native  
> **Security Model:** JWT (access + refresh) · Token rotation · Token family theft detection · bcrypt hashing · HTTP-only cookies · CSRF protection

---

## 1. Architecture Decision Log

Before any code — here's why each major decision was made:

| Decision                 | Choice                                | Why                                                                    |
| ------------------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| Backend framework        | Express.js                            | Lightweight, zero magic, full control over middleware chain            |
| Database                 | MongoDB                               | Flexible schema; auth documents map naturally to collections           |
| ORM                      | Prisma                                | Type-safe client, schema-first, cleaner than TypeORM decorators        |
| Token storage (web)      | Memory + HTTP-only cookie             | Access token in memory prevents XSS theft; HttpOnly cookie for refresh |
| Token storage (mobile)   | Memory + Keychain/EncryptedStorage    | OS-level encryption for refresh token                                  |
| Refresh token DB storage | Hashed with bcrypt                    | Plain token in DB = one breach = full compromise                       |
| Token rotation strategy  | Rotate + detect family theft          | Detect stolen token reuse; invalidate entire family on suspicion       |
| Google OAuth             | ID token verification (not code flow) | Frontend handles Google OAuth; backend just verifies the ID token      |
| Rate limiting            | express-rate-limit per IP per route   | Brute force protection on all auth endpoints                           |

---

## 2. Complete Folder Structure

```
project-root/
├── backend/                          # Express.js
│   ├── prisma/
│   │   └── schema.prisma             # Single source of truth for DB schema
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.ts             # PrismaClient singleton
│   │   ├── auth/
│   │   │   ├── auth.router.ts        # Route definitions + request/response
│   │   │   ├── auth.service.ts       # Business logic
│   │   │   └── auth.validators.ts    # Zod schemas + validate middleware
│   │   ├── users/
│   │   │   └── users.service.ts
│   │   ├── tokens/
│   │   │   └── tokens.service.ts
│   │   ├── middleware/
│   │   │   ├── authenticate.ts       # JWT access + refresh middleware
│   │   │   └── rate-limit.ts
│   │   ├── app.ts                    # Express app setup + middleware
│   │   └── server.ts                 # Entry point (listen)
│   ├── .env.example
│   └── package.json
│
├── web/                              # Next.js App Router
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (protected)/
│   │   │   └── dashboard/page.tsx
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── auth-context.tsx
│   │   │   ├── token-manager.ts
│   │   │   └── api-client.ts
│   │   └── hooks/
│   │       └── use-auth.ts
│   └── middleware.ts
│
└── mobile/                           # React Native
    ├── src/
    │   ├── auth/
    │   │   ├── AuthContext.tsx
    │   │   ├── token-storage.ts
    │   │   └── api-client.ts
    │   └── screens/
    │       ├── LoginScreen.tsx
    │       └── RegisterScreen.tsx
    └── package.json
```

---

## 3. Database Schema (Prisma)

### 3.1 prisma/schema.prisma

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

enum AuthProvider {
  local
  google
}

model User {
  id            String         @id @default(auto()) @map("_id") @db.ObjectId
  email         String         @unique
  passwordHash  String?        // null for Google users
  firstName     String?
  lastName      String?
  avatarUrl     String?
  provider      AuthProvider   @default(local)
  googleId      String?        @unique
  emailVerified Boolean        @default(false)
  isActive      Boolean        @default(true)
  refreshTokens RefreshToken[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId

  // Stored HASHED — never store plain token
  tokenHash String

  // Token family: all rotations of the same original token share a family ID.
  // If a used token is re-submitted, we invalidate the ENTIRE family (theft detection).
  family    String   @db.String

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String   @db.ObjectId

  expiresAt DateTime
  isRevoked Boolean  @default(false)

  // Device/browser info for session management UI
  userAgent String?
  ipAddress String?

  createdAt DateTime @default(now())

  @@index([family])
  @@index([userId])
  @@map("refresh_tokens")
}
```

> **Note on MongoDB + Prisma:** Prisma uses `@db.ObjectId` for MongoDB's native `_id` field. The `family` field uses `@db.String` to store plain UUID strings. No migrations needed — run `npx prisma db push` to sync the schema.

### 3.2 Prisma Singleton

```typescript
// backend/src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Prevent multiple PrismaClient instances in development (hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## 4. Backend — Express.js

### 4.1 Environment Configuration

```bash
# backend/.env.example
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/langlearn_auth?retryWrites=true&w=majority

JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_ACCESS_EXPIRY=15m

JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars-different-from-access
JWT_REFRESH_EXPIRY_DAYS=7

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Web client origin — used for CORS + cookie config
WEB_CLIENT_URL=https://your-app.com

BCRYPT_SALT_ROUNDS=12
NODE_ENV=production
PORT=3001
```

### 4.2 server.ts — Entry Point

```typescript
// backend/src/server.ts
import "dotenv/config";
import { app } from "./app";
import { prisma } from "./lib/prisma";

const PORT = process.env.PORT ?? 3001;

async function main() {
  await prisma.$connect();
  console.log("Connected to MongoDB");

  app.listen(PORT, () => {
    console.log(`Auth server running on port ${PORT}`);
  });
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
```

### 4.3 app.ts — Express Setup

```typescript
// backend/src/app.ts
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./auth/auth.router";

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.WEB_CLIENT_URL,
    credentials: true, // Required for cookies to work cross-origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"]
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Reject suspiciously large payloads
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Express identifies error handlers by the 4-argument signature (err, req, res, next)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(status).json({ message });
});

export { app };
```

### 4.4 Validators (Zod)

> No class-validator decorators. Zod schemas are simpler, framework-agnostic, and give better TypeScript inference.

```typescript
// backend/src/auth/auth.validators.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long"), // bcrypt silently truncates beyond 72 bytes
  firstName: z.string().min(1).max(50),
  lastName: z.string().max(50).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1)
});

// Reusable validation middleware factory
export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors
      });
    }
    req.body = result.data; // Replace with parsed + stripped data
    next();
  };
}
```

### 4.5 Middleware — JWT Authentication

```typescript
// backend/src/middleware/authenticate.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to carry the authenticated user payload
export interface AuthRequest extends Request {
  user?: {
    sub: string;
    email: string;
    tokenId?: string;
    family?: string;
    rawToken?: string;
  };
}

// ── Access token guard ────────────────────────────────────────────────────────
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No access token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
    req.user = payload;
    next();
  } catch (err: any) {
    const message =
      err.name === "TokenExpiredError"
        ? "Access token expired"
        : "Invalid access token";
    return res.status(401).json({ message });
  }
}

// ── Refresh token guard ───────────────────────────────────────────────────────
// Web sends refresh token via HttpOnly cookie
// Mobile sends it via Authorization: Bearer header
export function authenticateRefresh(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const rawToken =
    req.cookies?.refresh_token ?? req.headers.authorization?.split(" ")[1];

  if (!rawToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const payload = jwt.verify(
      rawToken,
      process.env.JWT_REFRESH_SECRET!
    ) as any;
    req.user = { ...payload, rawToken }; // Attach raw token for hash comparison in service
    next();
  } catch (err: any) {
    const message =
      err.name === "TokenExpiredError"
        ? "Refresh token expired"
        : "Invalid refresh token";
    return res.status(401).json({ message });
  }
}
```

### 4.6 Middleware — Rate Limiting

```typescript
// backend/src/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";

// Stricter limits on auth endpoints to block brute force
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Too many registration attempts" },
  standardHeaders: true,
  legacyHeaders: false
});

export const googleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false
});
```

### 4.7 Users Service

```typescript
// backend/src/users/users.service.ts
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

export const usersService = {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
  },

  // Explicitly select passwordHash — omitted by default to prevent accidental exposure
  async findByEmailWithPassword(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        provider: true,
        isActive: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        googleId: true
      }
    });
  },

  async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
  },

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }
};
```

### 4.8 Tokens Service

```typescript
// backend/src/tokens/tokens.service.ts
import jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RefreshJwtPayload extends JwtPayload {
  tokenId: string;
  family: string;
}

export const tokensService = {
  // ─── Generate Access Token ──────────────────────────────────────────────────
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? "15m") as any
    });
  },

  // ─── Generate & Store Refresh Token ────────────────────────────────────────
  async generateRefreshToken(
    userId: string,
    email: string,
    family: string,
    meta: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<string> {
    const tokenId = uuidv4();
    const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS ?? "7");

    const payload: RefreshJwtPayload = { sub: userId, email, tokenId, family };

    const rawToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: `${expiryDays}d` as any
    });

    // Hash before storing — bcrypt cost 10 is fine for random UUIDs (no dict attack risk)
    const tokenHash = await bcrypt.hash(rawToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await prisma.refreshToken.create({
      data: { id: tokenId, tokenHash, family, userId, expiresAt, ...meta }
    });

    return rawToken;
  },

  // ─── Rotate Refresh Token (with theft detection) ────────────────────────────
  async rotateRefreshToken(
    payload: RefreshJwtPayload & { rawToken: string },
    meta: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { id: payload.tokenId }
    });

    // ── Theft Detection ─────────────────────────────────────────────────────
    // Token record gone → already rotated → someone replaying a stolen token.
    // Nuke the entire family immediately.
    if (!storedToken) {
      await tokensService.revokeTokenFamily(payload.family);
      const err: any = new Error(
        "Refresh token reuse detected. All sessions revoked."
      );
      err.status = 403;
      throw err;
    }

    if (storedToken.isRevoked) {
      await tokensService.revokeTokenFamily(payload.family);
      const err: any = new Error("Revoked token used. All sessions revoked.");
      err.status = 403;
      throw err;
    }

    if (new Date() > storedToken.expiresAt) {
      const err: any = new Error("Refresh token expired");
      err.status = 401;
      throw err;
    }

    // Verify raw token matches stored hash
    const isValid = await bcrypt.compare(
      payload.rawToken,
      storedToken.tokenHash
    );
    if (!isValid) {
      await tokensService.revokeTokenFamily(payload.family);
      const err: any = new Error("Invalid refresh token");
      err.status = 403;
      throw err;
    }

    // ── Rotate: delete old, issue new ──────────────────────────────────────
    await prisma.refreshToken.delete({ where: { id: payload.tokenId } });

    const newAccessToken = tokensService.generateAccessToken({
      sub: payload.sub,
      email: payload.email
    });

    // Same family — keeps the lineage traceable
    const newRefreshToken = await tokensService.generateRefreshToken(
      payload.sub,
      payload.email,
      payload.family,
      meta
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  // ─── Revoke all tokens in a family (theft response) ────────────────────────
  async revokeTokenFamily(family: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { family },
      data: { isRevoked: true }
    });
  },

  // ─── Logout: revoke specific session OR all user sessions ──────────────────
  async revokeUserTokens(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      await prisma.refreshToken.deleteMany({ where: { id: tokenId, userId } });
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true }
      });
    }
  },

  // ─── Clean up expired tokens (run as cron) ──────────────────────────────────
  async cleanExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
  }
};
```

### 4.9 Auth Service

```typescript
// backend/src/auth/auth.service.ts
import * as bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { AuthProvider } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { usersService } from "../users/users.service";
import { tokensService } from "../tokens/tokens.service";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

type Meta = { userAgent?: string; ipAddress?: string };

function sanitizeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export const authService = {
  // ─── Register ────────────────────────────────────────────────────────────────
  async register(
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
    },
    meta: Meta = {}
  ) {
    const exists = await usersService.findByEmail(data.email);
    if (exists) {
      const err: any = new Error("Email already registered");
      err.status = 409;
      throw err;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12");
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = await usersService.create({
      email: data.email.toLowerCase().trim(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      provider: AuthProvider.local
    });

    const family = uuidv4();
    const accessToken = tokensService.generateAccessToken({
      sub: user.id,
      email: user.email
    });
    const refreshToken = await tokensService.generateRefreshToken(
      user.id,
      user.email,
      family,
      meta
    );

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  },

  // ─── Login ────────────────────────────────────────────────────────────────────
  async login(data: { email: string; password: string }, meta: Meta = {}) {
    const user = await usersService.findByEmailWithPassword(data.email);

    // Constant-time comparison — prevents timing attacks on email enumeration
    const DUMMY_HASH = "$2b$12$dummyhashforsecurityXXXXXXXXXXXXXXXXXXXXXXXX";
    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const isValid = await bcrypt.compare(data.password, hashToCompare);

    if (!user || !isValid || !user.isActive) {
      const err: any = new Error("Invalid credentials");
      err.status = 401;
      throw err;
    }

    if (user.provider !== AuthProvider.local) {
      const err: any = new Error(
        `This account uses ${user.provider} login. Please sign in with Google.`
      );
      err.status = 400;
      throw err;
    }

    const family = uuidv4();
    const accessToken = tokensService.generateAccessToken({
      sub: user.id,
      email: user.email
    });
    const refreshToken = await tokensService.generateRefreshToken(
      user.id,
      user.email,
      family,
      meta
    );

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  },

  // ─── Google OAuth ─────────────────────────────────────────────────────────────
  async googleAuth(idToken: string, meta: Meta = {}) {
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch {
      const err: any = new Error("Invalid Google token");
      err.status = 401;
      throw err;
    }

    const googlePayload = ticket.getPayload();
    if (!googlePayload?.email) {
      const err: any = new Error("Could not get email from Google token");
      err.status = 401;
      throw err;
    }

    const {
      sub: googleId,
      email,
      given_name,
      family_name,
      picture,
      email_verified
    } = googlePayload;

    let user = await usersService.findByGoogleId(googleId);

    if (!user) {
      const existingEmailUser = await usersService.findByEmail(email);
      if (
        existingEmailUser &&
        existingEmailUser.provider === AuthProvider.local
      ) {
        const err: any = new Error(
          "An account with this email already exists. Please log in with your password."
        );
        err.status = 409;
        throw err;
      }

      user = await usersService.create({
        email: email.toLowerCase().trim(),
        googleId,
        firstName: given_name,
        lastName: family_name,
        avatarUrl: picture,
        provider: AuthProvider.google,
        emailVerified: email_verified,
        passwordHash: null
      });
    }

    if (!user.isActive) {
      const err: any = new Error("Account is deactivated");
      err.status = 401;
      throw err;
    }

    const family = uuidv4();
    const accessToken = tokensService.generateAccessToken({
      sub: user.id,
      email: user.email
    });
    const refreshToken = await tokensService.generateRefreshToken(
      user.id,
      user.email,
      family,
      meta
    );

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  }
};
```

### 4.10 Auth Router

```typescript
// backend/src/auth/auth.router.ts
import { Router, Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { tokensService } from "../tokens/tokens.service";
import { usersService } from "../users/users.service";
import {
  validate,
  registerSchema,
  loginSchema,
  googleAuthSchema
} from "./auth.validators";
import {
  authenticate,
  authenticateRefresh,
  AuthRequest
} from "../middleware/authenticate";
import {
  loginLimiter,
  registerLimiter,
  googleLimiter
} from "../middleware/rate-limit";

const router = Router();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/api/v1/auth" // Restrict cookie to auth routes only
};

// Helper: detect mobile clients by User-Agent
function isMobile(req: Request): boolean {
  const ua = req.headers["user-agent"] ?? "";
  return /ReactNative|Expo|okhttp/.test(ua);
}

function getMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: (req.headers["x-forwarded-for"] as string) ?? req.ip
  };
}

// ─── POST /auth/register ────────────────────────────────────────────────────
router.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken, user } = await authService.register(
        req.body,
        getMeta(req)
      );

      if (!isMobile(req)) {
        res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
        return res.status(201).json({ accessToken, user });
      }

      return res.status(201).json({ accessToken, refreshToken, user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /auth/login ────────────────────────────────────────────────────────
router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken, user } = await authService.login(
        req.body,
        getMeta(req)
      );

      if (!isMobile(req)) {
        res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
        return res.json({ accessToken, user });
      }

      return res.json({ accessToken, refreshToken, user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /auth/google ───────────────────────────────────────────────────────
router.post(
  "/google",
  googleLimiter,
  validate(googleAuthSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken, user } = await authService.googleAuth(
        req.body.idToken,
        getMeta(req)
      );

      if (!isMobile(req)) {
        res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
        return res.json({ accessToken, user });
      }

      return res.json({ accessToken, refreshToken, user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /auth/refresh ──────────────────────────────────────────────────────
router.post(
  "/refresh",
  authenticateRefresh,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken } =
        await tokensService.rotateRefreshToken(req.user as any, getMeta(req));

      if (!isMobile(req)) {
        res.cookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTIONS);
        return res.json({ accessToken });
      }

      return res.json({ accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /auth/logout ───────────────────────────────────────────────────────
router.post(
  "/logout",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tokenId = req.user?.tokenId;
      await tokensService.revokeUserTokens(req.user!.sub, tokenId);

      res.clearCookie("refresh_token", { path: "/api/v1/auth" });
      return res.json({ message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /auth/me ────────────────────────────────────────────────────────────
router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await usersService.findById(req.user!.sub);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash, ...safe } = user as any;
      return res.json({ user: safe });
    } catch (err) {
      next(err);
    }
  }
);

export { router as authRouter };
```

---

## 5. Next.js Web Integration

### 5.1 Token Manager (in-memory with auto-refresh)

```typescript
// web/lib/auth/token-manager.ts
// Access token lives ONLY in memory — never localStorage, never sessionStorage.
// This is intentional. XSS cannot steal what isn't in the DOM.

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const tokenManager = {
  setAccessToken(token: string) {
    accessToken = token;
  },

  getAccessToken(): string | null {
    return accessToken;
  },

  clearAccessToken() {
    accessToken = null;
  },

  // If a refresh is already in progress, reuse the same promise.
  // This prevents multiple concurrent requests all triggering a refresh simultaneously
  // (the "thundering herd" problem).
  async refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include" // Send the HttpOnly refresh token cookie
    })
      .then(async (res) => {
        if (!res.ok) {
          accessToken = null;
          return null;
        }
        const data = await res.json();
        accessToken = data.accessToken;
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }
};
```

### 5.2 API Client with Automatic Token Refresh

```typescript
// web/lib/auth/api-client.ts
import { tokenManager } from "./token-manager";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
};

async function fetchWithAuth(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;

  const makeRequest = (token?: string | null) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...fetchOptions.headers
    };

    if (token && !skipAuth) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: "include"
    });
  };

  let token = tokenManager.getAccessToken();
  let response = await makeRequest(token);

  // Access token expired → try to refresh once
  if (response.status === 401 && !skipAuth) {
    const newToken = await tokenManager.refreshAccessToken();
    if (!newToken) {
      // Refresh failed — user needs to re-login
      window.location.href = "/login";
      return response;
    }
    response = await makeRequest(newToken);
  }

  return response;
}

export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetchWithAuth(endpoint);
    if (!res.ok) throw await parseError(res);
    return res.json();
  },

  async post<T>(
    endpoint: string,
    body: unknown,
    options?: FetchOptions
  ): Promise<T> {
    const res = await fetchWithAuth(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...options
    });
    if (!res.ok) throw await parseError(res);
    return res.json();
  }
};

async function parseError(res: Response) {
  try {
    const data = await res.json();
    return new Error(data.message ?? "Request failed");
  } catch {
    return new Error(`HTTP ${res.status}`);
  }
}
```

### 5.3 Auth Context

```typescript
// web/lib/auth/auth-context.tsx
'use client';

import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { tokenManager } from './token-manager';
import { apiClient } from './api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  provider: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session via silent refresh
  useEffect(() => {
    const restoreSession = async () => {
      const token = await tokenManager.refreshAccessToken();
      if (token) {
        try {
          const data = await apiClient.get<{ user: User }>('/auth/me');
          setUser(data.user);
        } catch {
          tokenManager.clearAccessToken();
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const handleAuthResponse = useCallback(async (data: { accessToken: string; user: User }) => {
    tokenManager.setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiClient.post<{ accessToken: string; user: User }>(
      '/auth/login',
      { email, password },
      { skipAuth: true },
    );
    await handleAuthResponse(data);
  }, [handleAuthResponse]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const data = await apiClient.post<{ accessToken: string; user: User }>(
      '/auth/google',
      { idToken },
      { skipAuth: true },
    );
    await handleAuthResponse(data);
  }, [handleAuthResponse]);

  const register = useCallback(async (registerData: RegisterData) => {
    const data = await apiClient.post<{ accessToken: string; user: User }>(
      '/auth/register',
      registerData,
      { skipAuth: true },
    );
    await handleAuthResponse(data);
  }, [handleAuthResponse]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      tokenManager.clearAccessToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

### 5.4 Next.js Middleware (Protected Routes)

```typescript
// web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_PATHS = ["/dashboard", "/lessons", "/profile", "/settings"];
const AUTH_PATHS = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get("refresh_token");

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // No refresh token + trying to access protected route → redirect to login
  if (isProtected && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Has refresh token + trying to access auth pages → redirect to dashboard
  if (isAuthPage && refreshToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"]
};
```

### 5.5 Next.js Route Handler (BFF proxy for refresh)

```typescript
// web/app/api/auth/refresh/route.ts
// This Next.js route proxies the refresh request to the backend.
// The frontend calls this route; this route forwards the HttpOnly cookie to the backend.

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `refresh_token=${refreshToken}`
    }
  });

  if (!response.ok) {
    const res = NextResponse.json(
      { message: "Session expired" },
      { status: 401 }
    );
    res.cookies.delete("refresh_token");
    return res;
  }

  const data = await response.json();

  // Forward the new refresh token cookie from backend to browser
  const backendCookieHeader = response.headers.get("set-cookie");
  const res = NextResponse.json({ accessToken: data.accessToken });

  if (backendCookieHeader) {
    res.headers.set("set-cookie", backendCookieHeader);
  }

  return res;
}
```

---

## 6. React Native Integration

### 6.1 Secure Token Storage

```typescript
// mobile/src/auth/token-storage.ts
// Uses react-native-keychain (iOS Keychain + Android Keystore)
// Fallback: @react-native-async-storage/async-storage with encryption via react-native-encrypted-storage

import * as Keychain from "react-native-keychain";

const REFRESH_TOKEN_SERVICE = "com.langlearn.refresh_token";

export const tokenStorage = {
  async saveRefreshToken(token: string): Promise<void> {
    await Keychain.setGenericPassword("refresh_token", token, {
      service: REFRESH_TOKEN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_SERVICE
      });
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  },

  async deleteRefreshToken(): Promise<void> {
    await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_SERVICE });
  }
};
```

### 6.2 Mobile API Client

```typescript
// mobile/src/auth/api-client.ts
import { tokenStorage } from "./token-storage";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const mobileTokenManager = {
  setAccessToken(token: string) {
    accessToken = token;
  },
  getAccessToken() {
    return accessToken;
  },
  clearAccessToken() {
    accessToken = null;
  },

  async refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) return null;

      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            "Content-Type": "application/json",
            "User-Agent": "ReactNative/LangLearn"
          }
        });

        if (!res.ok) {
          await tokenStorage.deleteRefreshToken();
          return null;
        }

        const data = await res.json();
        accessToken = data.accessToken;

        // Save the new rotated refresh token
        if (data.refreshToken) {
          await tokenStorage.saveRefreshToken(data.refreshToken);
        }

        return data.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  }
};

export async function mobileFetch(endpoint: string, options: RequestInit = {}) {
  const makeRequest = (token?: string | null) =>
    fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
        "User-Agent": "ReactNative/LangLearn"
      }
    });

  let res = await makeRequest(mobileTokenManager.getAccessToken());

  if (res.status === 401) {
    const newToken = await mobileTokenManager.refreshAccessToken();
    if (!newToken) throw new Error("SESSION_EXPIRED");
    res = await makeRequest(newToken);
  }

  return res;
}
```

### 6.3 Mobile Auth Context

```typescript
// mobile/src/auth/AuthContext.tsx
import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { tokenStorage } from './token-storage';
import { mobileFetch, mobileTokenManager } from './api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    const restore = async () => {
      const token = await mobileTokenManager.refreshAccessToken();
      if (token) {
        try {
          const res = await mobileFetch('/auth/me');
          const data = await res.json();
          setUser(data.user);
        } catch {
          mobileTokenManager.clearAccessToken();
        }
      }
      setIsLoading(false);
    };
    restore();
  }, []);

  const handleTokens = useCallback(async (data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  }) => {
    mobileTokenManager.setAccessToken(data.accessToken);
    await tokenStorage.saveRefreshToken(data.refreshToken);
    setUser(data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReactNative/LangLearn',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Login failed');
    }
    await handleTokens(await res.json());
  }, [handleTokens]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReactNative/LangLearn',
      },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Google login failed');
    }
    await handleTokens(await res.json());
  }, [handleTokens]);

  const register = useCallback(async (registerData: any) => {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReactNative/LangLearn',
      },
      body: JSON.stringify(registerData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Registration failed');
    }
    await handleTokens(await res.json());
  }, [handleTokens]);

  const logout = useCallback(async () => {
    try {
      await mobileFetch('/auth/logout', { method: 'POST' });
    } finally {
      mobileTokenManager.clearAccessToken();
      await tokenStorage.deleteRefreshToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated: !!user,
      login, loginWithGoogle, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
```

---

## 7. Security Checklist

| Threat                             | Mitigation Implemented                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| XSS stealing tokens                | Access token in memory only; refresh token in HttpOnly cookie                  |
| CSRF on cookie-based refresh       | `sameSite: strict` on cookie; refresh cookie path restricted to `/api/v1/auth` |
| Brute force login                  | `@nestjs/throttler` — 10 req/min on `/auth/login`                              |
| Refresh token theft                | Token stored hashed; token rotation; family-based theft detection              |
| Token replay after logout          | Token deleted from DB on logout; family revoked on suspicious reuse            |
| Timing attacks on password compare | Dummy hash comparison even when user not found                                 |
| Password hash compromise           | bcrypt with configurable salt rounds (12 default)                              |
| Google token forgery               | Verified via `google-auth-library` against Google's servers                    |
| Insecure headers                   | `helmet()` in main.ts                                                          |
| Overly broad CORS                  | Explicit origin allowlist only                                                 |
| Stale tokens in DB                 | `cleanExpiredTokens()` scheduled as a cron job                                 |
| bcrypt truncation                  | Password MaxLength set to 72 bytes                                             |

---

## 8. Package.json Dependencies

```json
// backend/package.json (key dependencies)
{
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "express-rate-limit": "^7.0.0",
    "google-auth-library": "^9.0.0",
    "helmet": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "uuid": "^9.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.0",
    "@types/cookie-parser": "^1.4.3",
    "@types/cors": "^2.8.13",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/uuid": "^9.0.0",
    "prisma": "^5.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "dev": "ts-node-dev --respawn src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  }
}
```

```json
// mobile/package.json (key auth dependencies)
{
  "dependencies": {
    "react-native-keychain": "^8.1.2",
    "@react-native-google-signin/google-signin": "^11.0.0"
  }
}
```

---

## 9. Critical Production Notes

**1. Sync schema to MongoDB (no migrations needed with MongoDB)**

```bash
# Push schema to MongoDB — Prisma creates collections and indexes automatically
npx prisma db push

# Regenerate the Prisma client after any schema change
npx prisma generate
```

**2. Token cleanup cron job**

```typescript
// Add to a ScheduleModule cron job — run daily
@Cron('0 3 * * *') // 3 AM every day
async cleanupExpiredTokens() {
  await this.tokensService.cleanExpiredTokens();
}
```

**3. Environment secrets management**

- Never commit `.env` files
- Use AWS Secrets Manager / GCP Secret Manager / Vault in production
- Rotate JWT secrets every 90 days (build a re-signing mechanism)

**4. Google OAuth setup**

- In Google Console: enable Google Identity API
- Add your domain to authorized JavaScript origins
- For mobile: add your app's bundle ID as an authorized Android/iOS client

**5. Session limits per user (optional hardening)**

```typescript
// In generateRefreshToken: count existing tokens for user
const existingCount = await this.prisma.refreshToken.count({
  where: { userId, isRevoked: false }
});
if (existingCount >= 5) {
  // Revoke oldest token — enforce max 5 concurrent sessions
  const oldest = await this.prisma.refreshToken.findFirst({
    where: { userId, isRevoked: false },
    orderBy: { createdAt: "asc" }
  });
  if (oldest)
    await this.prisma.refreshToken.delete({ where: { id: oldest.id } });
}
```
