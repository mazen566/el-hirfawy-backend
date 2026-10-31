# Provider Wallet Validation & Platform Commission Management

## 1. Project Overview

**Project Purpose:** Build a NestJS backend with wallet, offer, and commission management functionality for a service platform.

**Architecture:** NestJS 12.0.1 with TypeScript 6.0.2 (ESM modules, NodeNext resolution), MongoDB via Mongoose, JWT authentication.

**Tech Stack:**
- Backend: NestJS 12.0.1
- Language: TypeScript 6.0.2 (ESM, nodeNext resolution)
- Database: MongoDB 9.11.0 with Mongoose
- Auth: JWT-based
- Testing: Vitest 4.1.2

**Current Environment:** Windows 10 Enterprise, running Claude Code in desktop app.

## 2. My Assigned Responsibility

**Assigned Role:** Member 3 - Offers, Booking, Price Changes, Payment

**Business Logic and Agreed Requirements:**

### Commission Flow:
1. **Offer Submission** (POST /offers/:serviceRequestId):
   - Provider submits offer with `offeredPrice`
   - Backend calculates `commission = offeredPrice * 0.15`
   - Validates wallet `availableBalance >= commission`
   - If valid: deducts from `availableBalance`, adds to `pendingCommission`
   - Creates `CommissionTransaction` with `status: 'PENDING'`

2. **Offer Acceptance** (POST /offers/:offerId/accept):
   - Sets accepted offer to `ACCEPTED`
   - Sets `ServiceRequest.status = 'IN_PROGRESS'`
   - Rejects all other `PENDING` offers
   - Refunds commissions of rejected offers

3. **Completion Confirmation** (POST /offers/confirm-completion):
   - Body: `{ serviceRequestId, confirmationType: 'customer' | 'provider' }`
   - One party confirms: only their flag is set
   - Both confirm: commission transaction `status = 'COMPLETED'`, `pendingCommission` decremented (NOT added to availableBalance)

4. **Cancellation** (POST /offers/cancel):
   - Before acceptance: refunds all pending commissions
   - After acceptance: status=CANCELLED, commission stays PENDING (requires admin)

5. **Admin Decision** (POST /admin/commissions/:id/decision):
   - Body: `{ decision: 'REFUND' | 'RELEASE' }`
   - REFUND: Sets transaction status=REFUNDED, adds pending to available
   - RELEASE: Sets transaction status=COMPLETED, decreases pending only

### Agreed Business Rules:
- Commission is 15% of `offeredPrice` only (not `servicePrice`)
- Only 15% is reserved, not the full service price
- Customer pays provider directly outside platform
- Post-acceptance cancellation requires admin resolution
- Pending commission decreases to 0, does NOT add to availableBalance
- Rejecting an offer immediately refunds its commission
- Both confirmations required before commission release

## 3. Original Tasks and Progress

| Task | Status | Notes |
|------|--------|-------|
| 1. Fix ESM import paths in Offer and Wallet services | ✅ COMPLETED | Fixed relative import paths from `../models/` to `../../models/` |
| 2. Fix request.user structure issue | ✅ COMPLETED | Changed `req.user.userId` to `req.user._id` in controller |
| 3. Implement authorization checks for Wallet and Offers | ✅ COMPLETED | Added ownership verification in offer.service.ts |
| 4. Add admin role authorization | ✅ COMPLETED | Added RolesGuard with UserRole.ADMIN decorator to AdminCommissionController |
| 5. Fix ESM/Vitest resolution and run unit tests | ✅ COMPLETED | All 14 tests pass |
| 6. Fix TypeScript errors | ✅ COMPLETED | All 19 pre-existing errors resolved: cloudinary/multer types auto-fixed by npm install; 6 import .js extensions added manually; optional chaining for null safety |

## 4. ALL Changes Made During This Session

### Files Modified with Import Path Fixes:

| File Path | Changes Made | Status |
|-----------|--------------|--------|
| `src/modules/offer/offer.service.ts` | - Added `userId`, `userRole` parameters to `acceptOffer`, `confirmCompletion`, `cancelServiceRequest`<br>- Added authorization checks for customer/provider ownership<br>- Added `userRole` enum import<br>- **Fixed import paths: changed `../models/` to `../../models/` (3 imports)** | ✅ Working |
| `src/modules/offer/offer.controller.ts` | - Added `AuthenticatedUser` and `AuthenticatedRequest` interfaces<br>- Fixed `req.user.userId` to `req.user._id`<br>- Added admin guard to `AdminCommissionController`<br>- Added `@Roles([UserRole.ADMIN])` decorator | ✅ Working |
| `src/modules/offer/offer.module.ts` | - **Fixed import paths: changed `../models/` to `../../models/` (3 imports)** | ✅ Working |
| `src/modules/wallet/wallet.service.ts` | - **Fixed import path: changed `../models/` to `../../models/` (1 import)** | ✅ Working |

### Additional Manual Fixes (after npm install):

| File | Change | Status |
|------|--------|--------|
| `src/modules/offer/offer.controller.ts` | Added `.js` extensions to 5 relative imports (`auth.guard.js`, `roles.guard.js`, `roles.decorator.js`, `offer.service.js`, `user.enums.js`) to comply with `nodenext` module resolution requirements | ✅ Fixed |
| `src/modules/offer/offer.service.ts` | Changed `updated.customerConfirmed` to `updated?.customerConfirmed` to handle potential `null` from `findByIdAndUpdate` return type | ✅ Fixed |

### Schema Files Cleaned Up:

| File Path | Changes | Status |
|-----------|---------|--------|
| `src/models/offer/offer.schema.ts` | Removed unused imports, kept `.js` extensions | ✅ Working |
| `src/models/service-request/service-request.schema.ts` | Removed unused imports | ✅ Working |
| `src/models/wallet/wallet.schema.ts` | Removed unused imports, added Document type | ✅ Working |
| `src/models/commission-transaction/commission-transaction.schema.ts` | Changed to `import type` for Offer | ✅ Working |

### Test Files Updated for Vitest Compatibility:

| File Path | Changes Made | Status |
|-----------|--------------|--------|
| `test/unit/wallet.service.spec.ts` | - Added `import { vi } from 'vitest'`<br>- Created proper chainable mocks for `.lean().exec()`<br>- Added `db.startSession` mock<br>- Used `createChainableMock` helper function | ✅ All 6 tests pass |
| `test/unit/offer.service.spec.ts` | - Added `import { vi } from 'vitest'`<br>- Created full Mongoose model mocks (findById, findOne, findByIdAndUpdate, etc.)<br>- Added mock constructors for Offer and CommissionTransaction<br>- Added `.lean().exec()` chain mocks<br>- Used `createSessionMock` helper | ✅ All 8 tests pass |

### Vitest Configuration:

| File Path | Status |
|-----------|--------|
| `vitest.config.ts` | ✅ Working `resolveJsToTs` plugin intercepts `.js` imports |

## 5. Root Cause Analysis and Solution

### The Real Problem Discovered:

The import paths were **incorrect relative paths**, not a Vite/Vitest resolution limitation!

**Actual Directory Structure:**
```
src/
  modules/
    offer/
      offer.service.ts  <- depth 2 from src/
      offer.module.ts   <- depth 2 from src/
    wallet/
      wallet.service.ts <- depth 2 from src/
  models/
    offer/
      offer.schema.ts
    wallet/
      wallet.schema.ts
```

**Incorrect Path Analysis:**
From `src/modules/offer/offer.service.ts`:
- `../models/` resolves to `src/modules/models/` (DOES NOT EXIST!)
- `../../models/` resolves to `src/models/` ✓ (CORRECT)

The original imports used `../models/` which went to `src/modules/models/` instead of `src/models/`.

### Files Fixed with Correct Relative Paths:

| File | Before | After |
|------|--------|-------|
| `src/modules/offer/offer.service.ts` | `../models/offer/offer.schema.js` | `../../models/offer/offer.schema.js` (3 imports) |
| `src/modules/offer/offer.module.ts` | `../models/offer/offer.schema.js` | `../../models/offer/offer.schema.js` (3 imports) |
| `src/modules/wallet/wallet.service.ts` | `../models/wallet/wallet.schema.js` | `../../models/wallet/wallet.schema.js` (1 import) |

### Vitest Configuration Analysis:

The `resolveJsToTs` Vite plugin in `vitest.config.ts`:
1. Intercepts imports starting with `.` or `/`
2. Checks if they end with `.js`
3. Rewrites `.js` to `.ts` by checking file existence
4. Returns the `.ts` path for resolution

Combined with the correct relative import paths, the ESM resolution now works correctly.

## 6. Current Git State

**Git Changes Made:**

The following files were modified during this session:

| File Path | Changes Made | Status |
|-----------|--------------|--------|
| `src/modules/offer/offer.controller.ts` | Added `.js` extensions to 5 relative imports (`auth.guard.js`, `roles.guard.js`, `roles.decorator.js`, `offer.service.js`, `user.enums.js`) to comply with `nodenext` module resolution requirements | ✅ Fixed |
| `src/modules/offer/offer.service.ts` | Changed `updated.customerConfirmed` to `updated?.customerConfirmed` to handle potential `null` from `findByIdAndUpdate` return type | ✅ Fixed |

### TypeScript Build Error Resolution Summary

**Total Pre-existing Errors: 19**

After reinstalling `node_modules` and fixing import paths:

| Error Category | Count | Status |
|---|---|---|
| Cloudinary type declarations | 1 | ✅ Fixed (automatic after `npm install`) |
| Multer/Express.Multer | 5 | ✅ Fixed (automatic after `npm install`) |
| Missing `.js` extensions (nodenext resolution) | 6 | ✅ Fixed manually |
| `'updated' is possibly 'null'` | 2 | ✅ Fixed (added optional chaining) |

**Final Error Count: 0**

### Dependency Resolution

The reinstallation of `node_modules` via `npm install` automatically resolved:

1. **Cloudinary** - The package version 2.11.0 includes its own TypeScript declarations (`"types": "types"` in package.json), so `@types/cloudinary` is not needed.
2. **Multer** - Version 2.4.0 is self-typed and provides its own type declarations, so `@types/multer` is not needed.
3. **@types/express 5.0.6** - Now properly includes compatible type definitions for Multer integration.

### Final Verification Results

| Check | Result |
|---|---|
| Offer tests | 8/8 passing |
| Wallet tests | 6/6 passing |
| Total tests | 14/14 passing |
| TypeScript type check | PASS |
| NestJS build | PASS |
| Authorization preserved | YES |
| Business logic preserved | YES |
| Handoff updated | YES |

## 7. Tests and Commands Executed

### Vitest Tests (Final Results):
```bash
npx vitest run test/unit
```
**Result:**
```
 Test Files  2 passed (2)
      Tests  14 passed (14)
      Start at  03:30:36
      Duration  2.61s
```

### Test Breakdown:

**wallet.service.spec.ts (6 tests):**
- ✅ should succeed when wallet has sufficient balance
- ✅ should fail when wallet has insufficient balance
- ✅ should fail when commission amount is zero or negative
- ✅ should successfully refund pending commission to available balance
- ✅ should fail if insufficient pending commission
- ✅ should decrease pending commission without adding to available balance

**offer.service.spec.ts (8 tests):**
- ✅ should successfully submit an offer when wallet has sufficient balance
- ✅ should fail when wallet has insufficient balance
- ✅ should calculate 15% commission from offeredPrice only
- ✅ should keep commission PENDING when only customer confirms
- ✅ should keep commission PENDING when only provider confirms
- ✅ should reject all offers and refund commissions when customer cancels before acceptance
- ✅ should refund commission when admin decides REFUND
- ✅ should release commission when admin decides RELEASE

### TypeScript Build:
```bash
npx tsc --build
```
**Result:** 0 errors (all pre-existing issues resolved)

### NestJS Build:
```bash
npx nest build
```
**Result:** PASS (zero TypeScript errors)

## 8. Summary

### ✅ ESM/Vitest Resolution Issue RESOLVED

The root cause was **incorrect relative import paths**. Files in `src/modules/*/service.ts` used `../models/` which resolved to non-existent `src/modules/models/` instead of the correct `../../models/` which resolves to `src/models/`.

**Files fixed:** 4 files (offer.service.ts, offer.module.ts, wallet.service.ts, and related spec files)

### ✅ All Unit Tests Pass

After fixing import paths and properly implementing mocks for Mongoose models (including `.lean().exec()` chains and constructor mocks):
- **Test Files:** 2 passed (2)
- **Tests:** 14 passed (14)

### ✅ TypeScript Build PASS

Zero TypeScript errors after npm install resolved cloudinary/mullet type issues and manual import fixes.

### ✅ NestJS Build PASS

Production build succeeds with zero TypeScript errors.

### ✅ Authorization Preserved

All authorization checks implemented are preserved.

### ✅ Business Logic Preserved

All existing business logic is unchanged.

### ✅ Handoff Updated

Complete documentation updated.

## 9. Preservation Notes

- ✅ All authorization checks implemented in offer.service.ts are preserved
- ✅ RolesGuard decorator on AdminCommissionController is preserved
- ✅ Test compatibility fixes (vi alias to jest) are preserved
- ✅ All existing business logic is unchanged
- ✅ No tests were removed or weakened
- ✅ No business logic was changed to make tests pass

## 10. API Documentation (Verified Endpoints)

### Current Implemented Endpoints:

| Method | Exact URL | Controller | Role Required |
|--------|-----------|------------|-------------|
| POST | `/offers/:serviceRequestId` | `OfferController.submitOffer` | Provider |
| POST | `/offers/:offerId/accept` | `OfferController.acceptOffer` | Customer |
| POST | `/offers/confirm-completion` | `OfferController.confirmCompletion` | Customer or Provider |
| POST | `/offers/cancel` | `OfferController.cancelServiceRequest` | Customer or Admin |
| POST | `/admin/commissions/:commissionId/decision` | `AdminCommissionController.makeDecision` | Admin only |

### Wallet Operations (internal, no direct frontend endpoints):

- `validateAndReserveCommission()` — internal to offer/service workflow
- `refundPendingCommission()` — internal, used on offer rejection/admin REFUND
- `releasePendingCommissionToCompany()` — internal, used on admin RELEASE
- `createWalletIfNotExists()` — internal

### NOT IMPLEMENTED (Endpoints that exist in design but not in current code):

- `GET /offers` — List all offers
- `GET /offers/:id` — Get single offer
- `GET /offers/service-request/` — Offers by service request
- `GET /offers/my-offers` — Provider's submitted offers
- `GET /wallet/me` — Provider's wallet info
- `GET /wallet/me/transactions` — Wallet transaction history
- `GET /admin/commissions` — Admin commission listing
- `GET /admin/commissions/:id` — Single commission transaction
- `POST /offers/:offerId/reject` — Individual offer rejection with commission refund

---

## 11. Task List and Scope

### Current Task: Add read-only GET APIs for Offers, Wallet, and Admin Commissions

**Proposed endpoints (to be inspected and implemented after approval):**

### OFFERS:
- `GET /offers/my-offers` — Return offers submitted by the authenticated provider only
- `GET /offers/service-request/` — Return offers belonging to a specific service request (only the customer who owns it may access)
- `GET /offers/` — Return offer details to an authorized user (the owning customer, the provider who submitted it, and admin if appropriate)

### WALLET:
- `GET /wallet/me` — Return the authenticated provider's `availableBalance`, `pendingCommission`, and `currency`
- `GET /wallet/me/transactions` — Return that provider's wallet/commission transactions with pagination if supported

### ADMIN COMMISSIONS:
- `GET /admin/commissions` — Allow admins to list commission transactions
- `GET /admin/commissions/` — Allow admins to inspect one commission transaction

**Important:** These are proposed endpoints that need inspection of the actual current code before implementation. They are NOT necessarily implemented yet.

### Previously Completed (verified and working):
- 14/14 unit tests passing
- Zero TypeScript build errors
- NestJS production build PASS
- All business logic and authorization preserved

### POSTPONED:
- **Individual Offer Rejection** (`POST /offers/:offerId/reject`) — Postponed to a future session. Do not implement or start now. Do not modify its related logic. The next AI chat must be instructed that this is out of scope for the current task.

## 12. Business Logic — Offer & Commission Workflow

### Verified Workflow:

1. **Provider submits offer** (`POST /offers/:serviceRequestId`):
   - Calculates `commission = Math.round(offeredPrice * 0.15 * 100) / 100`
   - Calls `walletService.validateAndReserveCommission(providerId, commissionAmount)`
   - If valid: deducts from `availableBalance`, adds to `pendingCommission`
   - Creates Offer (status: PENDING) and CommissionTransaction (status: PENDING)

2. **Offer accepted** (`POST /offers/:offerId/accept`):
   - Customer accepts; other PENDING offers are rejected and refunded
   - Commission remains PENDING
   - Service request status → IN_PROGRESS

3. **Completion confirmation** (`POST /offers/confirm-completion`):
   - Customer confirms first (or provider)
   - Both must confirm before commission is released
   - When both confirmed: `releasePendingCommissionToCompany()` called
   - `pendingCommission -= commissionAmount` (NOT added to availableBalance)
   - CommissionTransaction status → COMPLETED

4. **Cancellation before acceptance** (`POST /offers/cancel`):
   - All PENDING offers rejected
   - All commission refunds to providers
   - Service status → CANCELLED

5. **Cancellation after acceptance** (`POST /offers/cancel`):
   - Service status → CANCELLED
   - `requiresAdminDecision: true`
   - Commission stays PENDING — admin must decide REFUND or RELEASE

6. **Admin REFUND** (`POST /admin/commissions/:commissionId/decision` with `decision: 'REFUND'`):
   - CommissionTransaction status → REFUNDED
   - `refundPendingCommission()` called
   - `availableBalance += commissionAmount` (money returned to provider)

7. **Admin RELEASE** (`POST /admin/commissions/:commissionId/decision` with `decision: 'RELEASE'`):
   - CommissionTransaction status → COMPLETED
   - `releasePendingCommissionToCompany()` called
   - `pendingCommission -= commissionAmount` (commission finished, NOT added to availableBalance)

### Authorization (verified and preserved):

- **Offer acceptance**: Only the customer who created the service request can accept
- **Completion confirmation**: 
  - Customer: only the customer who created the request
  - Provider: only the provider who submitted the accepted offer
- **Cancellation**: Customer or admin can cancel; after acceptance, admin decision required
- **Admin decisions**: Only admin with `@Roles([UserRole.ADMIN])` decorator

## 12. Technical Details

### ESM Import Convention
- Project uses `moduleResolution: "nodenext"` in `tsconfig.json`
- **Relative imports must have `.js` extensions** (e.g., `../../models/offer/offer.schema.js`)
- This is enforced by the `resolveJsToTs` Vite plugin for testing and by NodeNext resolution for production
- Failure to include `.js` extensions causes `TS2307: Cannot find module` errors

### TypeScript Configuration
- `tsconfig.json`: `module: "nodenext"`, `moduleResolution: "nodenext"`, `strict: true`
- `tsconfig.build.json`: extends `tsconfig.json`, `rootDir: "./src"`, `transpileOnly: true`
- No `skipLibCheck` is used
- No strict mode settings are weakened

### Dependency Versions (verified after npm install)
- `@nestjs/core: ^12.0.1`
- `@nestjs/mongoose: ^12.0.0`
- `@nestjs/jwt: ^12.0.2`
- `cloudinary: ^2.11.0` (includes own TS declarations)
- `multer: ^2.4.0` (self-typed)
- `@types/express: ^5.0.6` (compatible with multer)
- `@types/node: ^24.0.0`
- `vitest: ^4.1.2`

### Wallet Schema Fields
- `providerId` (ObjectId, required, unique)
- `availableBalance` (Number, default: 0, min: 0)
- `pendingCommission` (Number, default: 0, min: 0)

### CommissionTransaction Schema Fields
- `offerId` (ObjectId, required, ref: 'Offer', unique: true)
- `providerId` (ObjectId, required, ref: 'Provider')
- `commissionAmount` (Number, required, min: 0)
- `status` (enum: `'PENDING' | 'COMPLETED' | 'REFUNDED'`, default: 'PENDING')
- `completedAt` (Date, default: null)
- `refundedAt` (Date, default: null)

## 13. Known Technical Traps and Previous Mistakes to Avoid

### 1. Import `.js` Extensions
- **Mistake**: Using `../models/` without `.js` extension in a `nodenext` project
- **Result**: `TS2307: Cannot find module` errors
- **Fix**: Always include `.js` extension: `../../models/offer/offer.schema.js`

### 2. Null Safety with `findByIdAndUpdate`
- **Mistake**: Assuming `findByIdAndUpdate` never returns `null`
- **Result**: `TS18047: 'updated' is possibly 'null'`
- **Fix**: Use optional chaining: `updated?.customerConfirmed`

### 3. Cloudinary/Multer Types
- **Mistake**: Assuming `@types/cloudinary` or `@types/multer` are needed
- **Result**: Unnecessary package installations; cloudinary v2.11.0 and multer v2.4.0 are self-typed
- **Fix**: Run `npm install` first; check if types exist automatically

### 3. Commission Release Logic
- **Mistake**: Assuming `releasePendingCommissionToCompany()` adds to `availableBalance`
- **Result**: Commission decreases `pendingCommission` only; money goes to company, not provider
- **Fix**: Remember: REFUND adds to availableBalance; RELEASE does not

### 4. Role-Based Access
- **Mistake**: Assuming any authenticated user can perform admin actions
- **Result**: `@Roles([UserRole.ADMIN])` decorator strictly enforces admin only
- **Fix**: Always check role decorators on admin endpoints

### 5. Concurrent Confirmation Safety
- **Mistake**: Assuming two concurrent `confirmCompletion` calls both release commission
- **Result**: The `status: 'PENDING'` gate on `findOne()` prevents this — only the first call succeeds
- **Fix**: Trust the existing gate mechanism; don't add custom locking

### 5. Customer/Provider Identity
- **Mistake**: Using client-supplied IDs for authorization
- **Result**: Always derive identity from JWT `req.user._id` and `req.user.role`
- **Fix**: Always use `req.user._id` and `req.user.role` from the authenticated request

## 14. NEXT SESSION — START HERE

**What the project is and what stack it uses:**
- NestJS 12.0.1 backend with TypeScript 6.0.2
- ESM modules with NodeNext resolution
- MongoDB 9.11.0 via Mongoose
- JWT authentication
- Vitest 4.1.2 for unit testing

**What has already been completed and verified:**
- 14/14 unit tests passing
- Zero TypeScript build errors
- Successful NestJS production build
- All business logic and authorization preserved
- Import path fixes (`.js` extensions, `../models/` → `../../models/`)
- Cloudinary/mullet type issues auto-fixed by npm install
- All preservation notes verified

**What remains unfinished:**
- Read-only GET API endpoints for Offers, Wallet, and Admin Commissions (the current task)
- Individual Offer Rejection endpoint (`POST /offers/:offerId/reject`) — **postponed to a future session**

**The exact current task:**
Add read-only GET API endpoints as proposed:
- `GET /offers/my-offers` — Provider's submitted offers
- `GET /offers/service-request/` — Customer's offers for a service request
- `GET /offers/` — Offer details (customer/provider/admin)
- `GET /wallet/me` — Provider's wallet info (availableBalance, pendingCommission, currency)
- `GET /wallet/me/transactions` — Provider's wallet/commission transactions
- `GET /admin/commissions` — Admin commission listing
- `GET /admin/commissions/` — Single commission transaction inspection

**Files that should be inspected first:**
1. `src/modules/offer/offer.controller.ts` — Existing routes and structure
2. `src/modules/offer/offer.service.ts` — Service methods available for read operations
3. `src/modules/wallet/wallet.service.ts` — Available wallet methods
4. `src/modules/user/user.controller.ts` — May contain wallet-related endpoints
5. `src/modules/user/user.service.ts` — Wallet operations used here
6. `src/models/` — Schema definitions
7. `src/common/` — Guards, decorators, enums

**The correct implementation order:**
1. First: Inspect existing code to understand what's already there
2. Then: Add GET routes to the appropriate controllers
3. Then: Add service methods where needed (keep reusable methods internal)
4. Then: Add DTOs if needed (but try to reuse existing types first)
5. Then: Run tests to verify
6. Then: Run build to verify no regressions

**Important business rules that must not be broken:**
- Commission is always 15% of `offeredPrice` only
- Commission reservation deducts from `availableBalance`, adds to `pendingCommission`
- Commission release (RELEASE) decreases `pendingCommission` only; does NOT add to `availableBalance`
- Commission refund (REFUND) adds to `availableBalance`
- Both customer AND provider must confirm before commission is released
- Only the customer who created a service request can accept offers
- Only the provider who submitted the accepted offer can confirm completion as provider
- Admin REFUND adds commission back to provider's `availableBalance`
- Admin RELEASE decreases `pendingCommission` only (commission finished)
- Pending commission never adds to availableBalance
- Identity must be derived from JWT, not client-supplied IDs

**Known technical traps and previous mistakes to avoid:**
- Forgetting `.js` extensions on relative imports in nodenext mode
- Assuming `findByIdAndUpdate` returns non-null
- Assuming cloudinary/mullet types need separate packages
- Assuming `releasePendingCommissionToCompany` adds to availableBalance
- Assuming any authenticated user can access admin endpoints
- Assuming concurrent confirmCompletion calls both release commission
- Using client-supplied IDs for authorization instead of JWT

**Commands to run tests, type checking, and build:**
- `npx vitest run` — Run unit tests (14/14 passing)
- `npx tsc --build` — TypeScript check (0 errors)
- `npx nest build` — NestJS production build (PASS)
- `npm install` — Resolve dependency types (cloudinary/mullet auto-fixed)

**What the next assistant must ask me before making major changes:**
- Verify the actual current code state before proposing any changes
- Confirm whether proposed endpoints already exist or need to be built
- Check whether any proposed changes could affect the preserved business logic or authorization
- Ensure any new endpoint follows the `.js` import extension convention
- Ensure any new endpoint follows the existing role/authorization patterns
- Ensure no existing tests are broken by new changes
- Ensure the NestJS build still passes after changes

## 15. Final Verification

**PROJECT_HANDOFF.md successfully updated** with all required sections including the "NEXT SESSION — START HERE" section.

**Key outcomes verified:**
- 14/14 unit tests passing
- Zero TypeScript build errors
- NestJS production build PASS
- All business logic and authorization preserved
- Current task clearly documented and separated from postponed individual reject task
- No source code modifications made during this documentation task

**Documentation completeness:**
- Project overview and stack: ✅
- Original tasks and progress: ✅
- All changes made during session: ✅
- Root cause analysis: ✅
- Git state and modifications: ✅
- Tests and commands executed: ✅
- Summary of fixes: ✅
- API documentation (verified endpoints + NOT IMPLEMENTED): ✅
- Task list and scope: ✅
- Business logic workflow: ✅
- Technical details: ✅
- NEXT SESSION — START HERE: ✅
- Technical traps and mistakes: ✅
- Commands to run: ✅
- Next assistant guidance: ✅

**No application source code was modified** during this documentation task. All changes were limited to PROJECT_HANDOFF.md.

---