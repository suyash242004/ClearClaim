# ClearClaim AI — Login & Auth Strategy
## Decision Document | OKX.AI Genesis Hackathon 2026

---

## TL;DR — The Decision

**Keep the current database-based login. Improve the UI. Add wallet-connect as a display
feature (not auth). Do NOT switch to Google OAuth or wallet-as-identity.**

Here's exactly why, and the full long-term roadmap after the hackathon.

---

## Current Login State (What We Have)

```
Customer  → enters Customer ID (e.g. 101) + password123  → validated against Customer table
Admin     → enters admin password (hardcoded "admin123")  → no DB check
Hospital  → enters Hospital ID (e.g. 1) + hospital@2026  → validated against Hospital table
```

UI: Ghast-style black page, role cards with spotlight effect, clean form card.
The UI is actually solid. The PROBLEM is not the look — it's the auth model feeling fake.

**What feels unprofessional right now:**
- Customer ID "101" feels like a demo, not a real account
- Password hints showing "Default: password123" on the login page = not real-world
- Admin having a single hardcoded password = toy
- No email login = not how real insurance apps work
- No "forgot password", no "register" = dead ends for new users

---

## Option Analysis (All 3 Routes)

---

### Option A: Keep Current DB Login (RECOMMENDED FOR HACKATHON)

**What it is:** Customer logs in with email + password. Admin has a secret key.
Hospital logs in with ID + password. All validated against PostgreSQL.

**Changes needed:**
- Customer: switch from "Customer ID" → "Email" as the identifier
  (Customer table already has customer_email as UNIQUE column)
- Remove password hints from UI
- Admin: change hardcoded password to something non-obvious
- Hospital: keep ID + password (hospitals have assigned IDs, this is realistic)
- Add "Demo credentials" section on a separate info page, not on the login form

**Does DB stay needed?** YES. 100%. Customer data, policy data, claim data, family members,
hospitals — all live in PostgreSQL. The DB is the entire application. You cannot remove it.

**Pros:**
- Zero migration risk — everything works today
- No new dependencies
- Judges can actually log in and use the app
- 2 hours of work to polish
- Realistic for enterprise B2B software (insurance portals use email/password)

**Cons:**
- Not "Web3 native" for customer login
- No social login convenience

---

### Option B: Google OAuth (NOT RECOMMENDED FOR HACKATHON)

**What it is:** "Login with Google" button. Google returns user email and profile.
You map that email to a Customer record in the DB (or create a new one).

**Implementation reality:**
- Need to set up Google Cloud Console OAuth credentials
- Need callback URL (hard to do locally — needs ngrok or deployed URL)
- Need to handle new users (Google user not in Customer table = need registration flow)
- Session management changes (JWT tokens, not just Redux persist)
- Backend changes: new endpoint to verify Google ID token
- Time cost: 1-2 days minimum

**Does DB stay needed?** YES. Google only gives you an email and name. All insurance
data (policies, claims, hospitals) still lives in PostgreSQL. Google just handles
password-hashing so you don't have to.

**Verdict for hackathon:** Too much setup time for too little gain. Skip.

**For MVP after hackathon:** Worth adding. Use Supabase Auth (free tier) which handles
Google OAuth + gives you user management out of the box. Map supabase_user_id → customer_id.

---

### Option C: Wallet Login (NOT RECOMMENDED AS PRIMARY AUTH)

**What it is:** Customer connects OKX Wallet / MetaMask → signs a message (EIP-4361)
→ wallet address becomes their identity → you map wallet_address → customer_id in DB.

**Implementation reality:**
- New column needed: Customer.wallet_address VARCHAR(42)
- New endpoint: POST /api/auth/wallet — verifies signature, returns customer linked to address
- New user problem: what if wallet is not in the DB? Need a registration flow.
- For Admin and Hospital: wallets make no sense (hospital doesn't have a crypto wallet)
- For judges: they need to have OKX Wallet + testnet setup + correct wallet → very high friction

**Does DB stay needed?** YES. Wallet is just an identity layer. All insurance data still
lives in PostgreSQL. The wallet address just tells you WHO the customer is.

**Verdict for hackathon:** Wallet as identity creates too much friction for judges to
actually use the demo. A judge without OKX Wallet installed cannot log in at all.

**The RIGHT use of wallet for hackathon:**
- Wallet connect = for blockchain interaction (viewing tx hashes, verifying decisions)
- NOT for authentication
- Show "Connect Wallet" in navbar (already done) — this is correct

**For MVP after hackathon:** Add wallet login as an OPTIONAL second path:
"Login with email/password" OR "Login with OKX Wallet" — both work.

---

## The Real World: How Insurance Apps Actually Work

Modern healthcare organizations use federated authentication that centralizes identity
management, simplifies UX, and improves visibility across all access points.

Healthcare patient portals require role-based access control that ties each user account
to specific patient records, with robust identity verification during account creation.

**Real-world insurance portal login patterns (2026):**

| Company | Customer Login | Admin/Staff Login | Hospital/Provider |
|---|---|---|---|
| UnitedHealth MyChart | Email + Password + MFA | SSO (Okta/Azure AD) | Provider portal: NPI number + password |
| Aetna Member Portal | Email + Password | Corporate SSO | Provider ID + password |
| ICICI Lombard (India) | Policy number OR mobile OTP | Employee SSO | Hospital empanelment ID |
| Niva Bupa | Member ID OR mobile OTP | Internal auth | Network hospital ID |

**Key insight for ClearClaim:**
- Customers: email is the universal identifier, not a numeric ID
- Admins: typically SSO in real orgs, but a strong password + role is acceptable for MVP
- Hospitals: provider/hospital ID + password is standard industry practice

---

## What To Do Right Now (For Hackathon — 2 hours)

### Change 1: Customer login → email-based

Currently: Customer ID (number) + password
Change to: Email + password

The Customer table already has `customer_email VARCHAR(150) UNIQUE NOT NULL`.
Backend already has `/api/CustomerRead` endpoint.

**Frontend change in Login.tsx:**
```typescript
// Instead of:
const res = await readApi.get(`/api/CustomerRead/${userId}`);

// Do this:
const res = await readApi.get(`/api/CustomerRead/email/${email}`);
// OR: fetch by email using existing search endpoint
const res = await readApi.get(`/api/customer/by-email?email=${encodeURIComponent(email)}`);
```

**Backend change needed (1 new endpoint in ReadAPI):**
```csharp
[HttpGet("by-email")]
public async Task<IActionResult> GetByEmail([FromQuery] string email)
{
    var result = await _customerReadRepository.GetByEmailAsync(email);
    return Ok(new { record = result });
}
```

**Dapper query:**
```sql
SELECT * FROM "Customer" WHERE customer_email = @email LIMIT 1
```

**Demo credentials (shown on a separate /demo page, not login page):**
```
Customer:  suy@gmail.com / password123
Admin:     admin / clearclaim@2026
Hospital:  Hospital ID 1 / hospital@2026
```

### Change 2: Remove password hints from login form
Delete the "Default: password123" and "Default: admin123" lines from Login.tsx UI.
Add a subtle "View demo credentials" link at bottom → navigates to /demo page.

### Change 3: Admin password change
Change from "admin123" to something less toy-like: "ClearClaim@Admin2026"
Update Login.tsx line: `if (adminPassword !== "ClearClaim@Admin2026")`

### Change 4: Add /demo page
Simple public page listing test credentials. Judges find it, not shown on login.

---

## SQL Migration — What You Need to Run NOW

The PatientInterventions table and risk_score column are in MedicalInsurance.sql
but may NOT be in your running database yet.

Run this in pgAdmin on your `medical_insurance` database:

```sql
-- Run ONLY these lines (migration only — don't re-run the whole file)

CREATE TABLE IF NOT EXISTS "PatientInterventions" (
    intervention_id SERIAL PRIMARY KEY,
    customer_id     INT NOT NULL UNIQUE,
    risk_score      NUMERIC(5,2) NOT NULL,
    risk_factors    JSONB NOT NULL DEFAULT '[]',
    care_plan       JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_intervention_customer
        FOREIGN KEY (customer_id) REFERENCES "Customer"(customer_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interventions_customer ON "PatientInterventions"(customer_id);
CREATE INDEX IF NOT EXISTS idx_interventions_unread ON "PatientInterventions"(is_read) WHERE is_read = FALSE;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2) DEFAULT 0;

-- Verify:
SELECT table_name FROM information_schema.tables WHERE table_name = 'PatientInterventions';
SELECT column_name FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'risk_score';
```

---

## Deployment (MVP After Hackathon)

### Frontend: Vercel (free)
```bash
cd clearclaim-frontend
npm run build
# Deploy dist/ to Vercel — takes 5 minutes
```
URL: `clearclaim-ai.vercel.app`

### Backend (.NET): Railway or Render (free tier)
- Deploy ReadAPI and WriteAPI as two separate services
- Both connect to a hosted PostgreSQL (see below)
- Set environment variable: `AppConn=Host=...;Database=...;Password=...`

### Database: Supabase or Neon (free PostgreSQL hosting)
- Supabase: free tier = 500MB database, built-in auth, REST API
- Neon: serverless PostgreSQL, generous free tier, branches
- Migration: export from local pgAdmin → import to Supabase/Neon
  `pg_dump -U postgres medical_insurance > backup.sql`
  Then import via Supabase dashboard or psql connection

### Python Agents: Railway or Render
```bash
# Dockerfile in agents/ folder
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "main.py"]
```

### Smart Contracts: Already deployed on X Layer Testnet ✅
- InsuranceClaim: 0xB0Df35C3097B680B0e0D96721eaf2C012B8E447C
- RiskOracle:     0xD1CAF7812321B0cf3F8568079F213042D8e284f6
- HealthGuardian: 0x07Fc775Aa387e0E8b71dB1053fF3977ec0a8302f

### For actual judges to test during hackathon:
Deploy frontend to Vercel NOW (today). They can use it with local backend or
Railway-hosted backend. The demo video + X post just needs a live URL.

---

## Long-Term Auth Roadmap (Post Hackathon MVP)

### Phase 1 (Now — hackathon): DB login with email
- Email + password for customers
- Admin key for admin
- Hospital ID + password for hospitals

### Phase 2 (MVP launch — 2 weeks post hackathon):
- Add Supabase Auth for customer login (handles email verification, password reset)
- Google OAuth via Supabase (one line of config)
- Keep all insurance data in PostgreSQL, map supabase_user_id → customer_id
- Customer self-registration: fill profile → create Customer record in DB

### Phase 3 (Web3-native — 1 month post hackathon):
- Add "Login with OKX Wallet" as OPTIONAL path for crypto-native customers
- Map wallet_address → customer_id in Customer table
- Sign-In with Ethereum (EIP-4361): customer signs a message, server verifies
- Keep email login as primary (most users don't have wallets)
- Wallet login gives access to blockchain features: see their claim TX hashes directly

### Phase 4 (Enterprise — 3 months post hackathon):
- Admin SSO (Azure AD or Okta) — insurance companies use corporate identity
- Hospital provider portal with MFA
- HIPAA-compliant audit trails for all logins
- Session timeout and device management

---

## Summary Table

| Auth Method | Hackathon (Now) | MVP (2 weeks) | Enterprise (3 months) |
|---|---|---|---|
| Customer: email + password | ✅ Do this now | ✅ Keep + Supabase | ✅ Keep + MFA |
| Customer: Google OAuth | ❌ Skip | ✅ Add via Supabase | ✅ Keep |
| Customer: Wallet login | ❌ Skip | ❌ Optional | ✅ Optional path |
| Admin: password | ✅ Keep | ✅ Keep | → SSO |
| Hospital: ID + password | ✅ Keep | ✅ Keep + email | ✅ Keep + MFA |
| Wallet: connect in navbar | ✅ Keep (UI only) | ✅ Keep | ✅ Full integration |

---

**Bottom line:** You have 6 days to deadline. Spend 2 hours on login polish,
not 2 days on a full auth rewrite. The login UI is already Ghast-level quality —
the only real fix is email instead of numeric ID and removing the password hints.
Everything else is post-hackathon work.
