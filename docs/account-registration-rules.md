# Heybo Pet Account Registration Rules

## 1. Purpose

This document defines the account registration, login, third-party binding, and account recovery rules for Heybo Pet.

It is intended to be the reference document for implementation, QA, customer support, incident review, and future regional compliance changes.

## 2. Core Principles

- `users` is the Heybo Pet user entity.
- `user_identities` stores login identities that belong to one Heybo Pet user.
- A user has one regional primary identity.
- Third-party providers are auxiliary login identities, not replacement user accounts.
- Every auxiliary identity must eventually bind to the regional primary identity.
- Each regional data center is an independent account domain.
- User data is not shared across China, US, and Europe data centers.
- Uniqueness is enforced inside one data center, not globally across all data centers.

## 3. Regional Account Domains

Heybo Pet has three major business regions:

- China region: `CN`
- United States region: `US`
- Europe region: `EU`

Each region is deployed in a separate data center. User data must not be replicated or joined across these data centers.

Implications:

- The same phone number or email can theoretically exist in different data centers.
- Login, account lookup, identity binding, passwordless verification, sessions, and audit logs are resolved only inside the current region.
- The client must select or be routed to the correct region before login.
- Backend code must not query another region to decide whether a user exists.
- Cross-region account migration, if needed later, must be designed as a separate consent-based export/import workflow.

## 4. Regional Primary Identity Rules

### 4.1 China Region

Primary identity:

- `phone`

Auxiliary identities:

- `wechat`
- Optional future providers: `apple`, `email`

Rules:

- `users.primary_phone` must be unique in the China data center.
- `user_identities(provider = phone, login_hash)` must be unique in the China data center.
- A China user can log in with phone verification code.
- A new phone verification login automatically creates a new Heybo Pet user if the phone does not exist.
- If the phone already exists, phone verification login signs in to the existing user.
- WeChat login must not create an unbound standalone user.
- New WeChat login without an existing binding must return `need_bind_phone`.

### 4.2 United States Region

Primary identity:

- `email`

Auxiliary identities:

- `google`
- `apple`

Rules:

- `users.primary_email` must be unique in the US data center.
- `user_identities(provider = email, login_hash)` must be unique in the US data center.
- A US user can log in with email verification code.
- A new email verification login automatically creates a new Heybo Pet user if the email does not exist.
- If the email already exists, email verification login signs in to the existing user.
- Google and Apple login must not create an unbound standalone user.
- New Google or Apple login without an existing binding must return `need_bind_email`.

### 4.3 Europe Region

Primary identity:

- `email`

Auxiliary identities:

- `google`
- `apple`

Rules:

- `users.primary_email` must be unique in the Europe data center.
- `user_identities(provider = email, login_hash)` must be unique in the Europe data center.
- A Europe user can log in with email verification code.
- A new email verification login automatically creates a new Heybo Pet user if the email does not exist.
- If the email already exists, email verification login signs in to the existing user.
- Google and Apple login must not create an unbound standalone user.
- New Google or Apple login without an existing binding must return `need_bind_email`.

## 5. Data Model Rules

### 5.1 users

`users` is the highest-level Heybo Pet account object.

Required business fields:

- `id`
- `display_name`
- `avatar_url`
- `primary_phone`
- `primary_email`
- `country_code`
- `region`
- `language`
- `timezone`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`
- `deleted_at`

Rules:

- China users should have `primary_phone`.
- US and Europe users should have `primary_email`.
- `status = deleted` users cannot log in.
- `status = suspended` users cannot create new sessions.
- Phone and email should be normalized before storage and lookup.
- Sensitive lookup values should have hashed indexes in `user_identities`.

### 5.2 user_identities

`user_identities` stores all login identities for one user.

Required business fields:

- `id`
- `user_id`
- `region`
- `provider`
- `provider_user_id`
- `provider_union_id`
- `login_hash`
- `phone_country_code`
- `is_primary`
- `verified_at`
- `provider_payload`
- `created_at`
- `updated_at`
- `unbound_at`

Provider rules:

- `phone`: primary identity in China.
- `email`: primary identity in US and Europe.
- `wechat`: auxiliary identity in China.
- `google`: auxiliary identity in US and Europe.
- `apple`: auxiliary identity in US and Europe.

Uniqueness rules inside each data center:

- One `phone` identity can belong to only one user.
- One `email` identity can belong to only one user.
- One `wechat` identity can belong to only one user.
- One `google` identity can belong to only one user.
- One `apple` identity can belong to only one user.
- `provider + provider_user_id` must be unique.
- `provider + login_hash` must be unique for primary identities.

Provider identifier notes:

- WeChat uses `openid`, and may also provide `unionid`.
- Google should use the stable subject value, usually `sub`.
- Apple should use the stable Apple user identifier.
- Do not assume Google or Apple identifiers are called `openid`.
- Do not assume Apple always returns a real user email.

### 5.3 sms_verification_codes

`sms_verification_codes` stores China phone verification codes.

Required business fields:

- `id`
- `region`
- `country_code`
- `phone`
- `phone_hash`
- `scene`
- `code_hash`
- `expires_at`
- `used_at`
- `attempt_count`
- `send_ip`
- `user_agent`
- `created_at`

Rules:

- Verification code TTL should be short, recommended 5 minutes.
- A phone number can request one code per 60 seconds.
- A phone number can request at most 10 codes per day.
- An IP address can request at most 10 verification codes per minute.
- An IP address can request at most 30 verification codes per day.
- One code can be used only once.
- Only store a hash of the code.
- One code can be attempted at most 5 times.
- If the same phone number fails verification more than 10 times in 10 minutes, lock verification for 30 minutes.
- In non-production environments, a mock SMS provider can return or log the test code.
- In production, the raw code must not be returned by API.

### 5.4 email_verification_codes

`email_verification_codes` stores US and Europe email verification codes.

Required business fields:

- `id`
- `region`
- `email`
- `email_hash`
- `scene`
- `code_hash`
- `expires_at`
- `used_at`
- `attempt_count`
- `send_ip`
- `user_agent`
- `created_at`

Rules:

- Verification code TTL should be short, currently 5 minutes.
- An email can request one code per 60 seconds.
- An email can request at most 10 codes per day.
- An IP address can request at most 10 verification codes per minute.
- An IP address can request at most 30 verification codes per day.
- One code can be used only once.
- Only store a hash of the code.
- One code can be attempted at most 5 times.
- If the same email fails verification more than 10 times in 10 minutes, lock verification for 30 minutes.
- In production, the raw code must not be returned by API.

### 5.5 verification_failures

`verification_failures` stores failed SMS and email verification attempts for risk control.

Required business fields:

- `id`
- `region`
- `target_hash`
- `reason`
- `ip`
- `user_agent`
- `created_at`

Rules:

- Record failed verification attempts for missing, expired, wrong, and attempt-limited codes.
- Count failures per region and target.
- If one phone or email fails more than 10 times in 10 minutes, lock verification for 30 minutes.
- Do not store raw phone numbers, raw emails, or raw verification codes in this table.

### 5.6 auth_sessions or refresh_tokens

The account system should create a server-side login session or refresh token record after successful login.

Required business fields:

- `id`
- `user_id`
- `region`
- `refresh_token_hash`
- `device_id`
- `device_name`
- `platform`
- `ip`
- `user_agent`
- `expires_at`
- `revoked_at`
- `created_at`
- `last_seen_at`

Rules:

- Access tokens can be JWTs with short or medium TTL.
- Refresh tokens must be stored hashed.
- Logout revokes the current session or refresh token.
- Logout all devices revokes all active sessions for the user.
- Deleted or suspended users cannot refresh sessions.
- Session records are regional and never shared across data centers.

### 5.7 account_merge_logs

`account_merge_logs` records identity binding and account merge decisions.

Recommended fields:

- `id`
- `region`
- `source_user_id`
- `target_user_id`
- `identity_id`
- `merge_type`
- `reason`
- `operator_type`
- `operator_id`
- `before_snapshot`
- `after_snapshot`
- `created_at`

Rules:

- Binding an unbound third-party identity to an existing primary user should be logged.
- Moving pets, devices, orders, or households between users must be logged.
- Fully automatic destructive merges are not allowed in the first version.
- Customer support assisted merge must be auditable.

## 6. China Phone Login Flow

### 6.0 Temporary Factory Test Login Compatibility

During hardware factory integration, `POST /api/auth/mock-login` may allow explicitly whitelisted factory test accounts.

Rules:

- This is a temporary integration path, not the target user login model.
- Whitelisted factory accounts must require a password.
- Successful factory mock login must still create a normal Heybo user, default household, Tuya mapping, access token, and refresh token.
- The response may include both `access_token` and `token` for B2.0 client compatibility.
- The whitelisted phone `18757129405` maps to Tuya UID `18757129405` for Tuya platform allowlist testing.
- The final customer-facing login path remains phone verification code in China.

### 6.1 Send SMS Code

Endpoint:

- `POST /api/auth/phone/send-code`

Input:

- `country_code`
- `phone`
- `scene`

Rules:

- Normalize phone number.
- Validate region policy allows phone primary login.
- Enforce one code per phone per 60 seconds.
- Enforce daily send limits.
- Create `sms_verification_codes` record.
- Send code through SMS provider.
- Return success without exposing whether the phone already has a user.

### 6.2 Verify SMS Code and Login

Endpoint:

- `POST /api/auth/phone/login`

Input:

- `country_code`
- `phone`
- `code`

Rules:

- Normalize phone number.
- Verify code is correct, not expired, not used, and within attempt limit.
- If phone identity exists, load existing user.
- If phone identity does not exist, create user and phone identity.
- Mark code as used.
- Update `users.last_login_at`.
- Create session or refresh token.
- Return access token, refresh token, user, and default household context.

## 7. China WeChat Auxiliary Login Flow

### 7.1 WeChat Login

Endpoint:

- `POST /api/auth/wechat/login`

Input:

- `code`

Rules:

- Exchange WeChat `code` for `openid` and optional `unionid`.
- Find `user_identities(provider = wechat, provider_user_id = openid)`.
- If found, login the bound user.
- If not found, return `need_bind_phone` plus a short-lived bind token.
- Do not create a standalone user from WeChat alone.

### 7.2 Bind WeChat with Phone

Endpoint:

- `POST /api/auth/wechat/bind-phone`

Input:

- `bind_token`
- `country_code`
- `phone`
- `sms_code`

Rules:

- Validate bind token.
- Verify phone SMS code.
- If phone identity exists, bind WeChat identity to that existing user.
- If phone identity does not exist, create a new user with phone primary identity, then bind WeChat identity.
- If WeChat identity is already bound to another user, reject the request.
- If phone identity is already bound to another user, bind WeChat to the phone owner instead of creating another user.
- Create account merge or identity binding audit log.
- Create session or refresh token.
- Return access token, refresh token, and user.

## 8. US and Europe Email Login Flow

### 8.1 Send Email Code

Endpoint:

- `POST /api/auth/email/send-code`

Input:

- `email`
- `scene`

Rules:

- Normalize email.
- Validate region policy allows email primary login.
- Enforce one code per email per 60 seconds.
- Enforce daily send limits.
- Create `email_verification_codes` record.
- Send code through email provider.
- Return success without exposing whether the email already has a user.

### 8.2 Verify Email Code and Login

Endpoint:

- `POST /api/auth/email/login`

Input:

- `email`
- `code`

Rules:

- Normalize email.
- Verify code is correct, not expired, not used, and within attempt limit.
- If email identity exists, load existing user.
- If email identity does not exist, create user and email identity.
- Mark code as used.
- Update `users.last_login_at`.
- Create session or refresh token.
- Return access token, refresh token, user, and default household context.

## 9. US and Europe Google or Apple Auxiliary Login Flow

### 9.1 Third-Party Login

Endpoint examples:

- `POST /api/auth/google/login`
- `POST /api/auth/apple/login`

Input:

- Provider authorization payload.

Rules:

- Verify the provider token with the provider public keys or official SDK.
- Extract stable provider subject.
- Find `user_identities(provider, provider_user_id)`.
- If found, login the bound user.
- If not found, return `need_bind_email` plus a short-lived bind token.
- Do not create a standalone user from Google or Apple alone.
- Do not trust provider email alone as account ownership proof for binding.

### 9.2 Bind Third-Party Identity with Email

Endpoint examples:

- `POST /api/auth/google/bind-email`
- `POST /api/auth/apple/bind-email`

Input:

- `bind_token`
- `email`
- `email_code`

Rules:

- Validate bind token.
- Verify email code.
- If email identity exists, bind third-party identity to that existing user.
- If email identity does not exist, create a new user with email primary identity, then bind third-party identity.
- If third-party identity is already bound to another user, reject the request.
- If email identity is already bound to another user, bind third-party identity to the email owner instead of creating another user.
- Create account merge or identity binding audit log.
- Create session or refresh token.
- Return access token, refresh token, and user.

## 10. Binding, Unbinding, and Merge Rules

### 10.1 Binding Rules

- A user can bind multiple auxiliary identities.
- A user can have only one active primary phone in China.
- A user can have only one active primary email in US and Europe.
- Binding requires ownership proof of the regional primary identity.
- Binding must be idempotent when repeated with the same user and same identity.

### 10.2 Unbinding Rules

- A user cannot unbind the only active primary identity.
- A user can unbind an auxiliary identity if a primary identity remains.
- Unbinding must set `unbound_at` or create an audit event.
- Rebinding an auxiliary identity to a different user requires primary identity verification and audit logging.

### 10.3 Merge Rules

Preferred first-version behavior:

- Bind the new identity to the existing primary user.
- Do not move pets, devices, orders, payments, or households automatically unless explicitly required.

When true data merge is needed:

- Pick one target user.
- Preserve payment and order history.
- Preserve device ownership carefully.
- Preserve household membership.
- Record before and after snapshots.
- Make the operation reversible where practical.

## 11. Security and Risk Controls

### 11.1 Current Verification Risk Control Parameters

The current implementation uses the following fixed verification-code risk control parameters:

| Rule | Current value |
| --- | --- |
| SMS code validity | 5 minutes |
| Email code validity | 5 minutes |
| Same phone or email send interval | 1 code per 60 seconds |
| Same phone or email daily send limit | 10 codes per day |
| Same IP send limit | 10 codes per minute |
| Same IP daily send limit | 30 codes per day |
| Same verification code attempt limit | 5 attempts |
| Same phone or email failure lock threshold | More than 10 failures within 10 minutes |
| Same phone or email lock duration | 30 minutes |

Notes:

- The 60-second send interval is used only for repeat-send control.
- The verification-code validity window is separate from the repeat-send interval.
- IP limits are counted per region data center.
- Phone and email limits are counted per region data center.
- Failure locks are based on hashed phone or email targets; raw phone numbers, raw emails, and raw codes must not be stored in risk-control logs.

### 11.2 General Security Controls

- Verification code send interval: one request per target per 60 seconds.
- Verification code TTL: 5 minutes for SMS and 5 minutes for email.
- Target daily send limit: at most 10 codes per phone or email per day.
- IP send limit: at most 10 codes per minute.
- IP daily send limit: at most 30 codes per day.
- Code attempt limit: 5 attempts per code.
- Target failure lock: more than 10 failures in 10 minutes locks verification for 30 minutes.
- IP-based send and verify limits.
- Device-based send and verify limits when device identifiers are available.
- Store only code hashes, never raw verification codes.
- Return generic errors for login lookup paths.
- Do not reveal whether a phone or email exists during send-code.
- JWT secret must be required in production.
- Refresh tokens must be hashed and revocable.
- All auth events should be logged with region, user id when known, provider, IP, user agent, and result.

## 12. Implementation Steps

### Step 1. Confirm Region Policy Layer

- Add a backend account policy config for `CN`, `US`, and `EU`.
- Define primary identity and allowed auxiliary providers per region.
- Make auth routes read the current deployment region from environment config.

### Step 2. Update Database Schema

- Add or update `users` constraints for regional primary identities.
- Add `region`, `provider_union_id`, `provider_payload`, `updated_at`, and `unbound_at` to `user_identities` if needed.
- Add `sms_verification_codes`.
- Add `email_verification_codes`.
- Add `auth_sessions` or `refresh_tokens`.
- Add `account_merge_logs`.
- Add unique indexes for primary identities and auxiliary provider identities.

### Step 3. Build Verification Code Services

- Implement phone normalization and email normalization.
- Implement code generation and hashing.
- Implement send interval limits.
- Implement attempt limits and expiry checks.
- Add mock providers for local and test environments.
- Add SMS provider adapter for China production.
- Add email provider adapter for US and Europe production.

### Step 4. Build Primary Login APIs

- Implement `POST /api/auth/phone/send-code`.
- Implement `POST /api/auth/phone/login`.
- Implement `POST /api/auth/email/send-code`.
- Implement `POST /api/auth/email/login`.
- Ensure login creates user automatically when primary identity does not exist.
- Ensure login reuses existing user when primary identity exists.

### Step 5. Build Session APIs

- Create access token generation.
- Create refresh token or auth session records.
- Implement `POST /api/auth/refresh`.
- Implement `POST /api/auth/logout`.
- Implement `POST /api/auth/logout-all`.
- Make `GET /api/users/me` work from the new session model.

### Step 6. Build China WeChat Auxiliary Login

- Implement WeChat code exchange service.
- Implement `POST /api/auth/wechat/login`.
- Return `need_bind_phone` for unbound WeChat identities.
- Implement bind token signing and expiry.
- Implement `POST /api/auth/wechat/bind-phone`.
- Enforce WeChat and phone uniqueness.

### Step 7. Build US and Europe Google or Apple Auxiliary Login

- Implement Google token verification.
- Implement Apple token verification.
- Implement `POST /api/auth/google/login`.
- Implement `POST /api/auth/apple/login`.
- Return `need_bind_email` for unbound third-party identities.
- Implement provider email binding APIs.
- Enforce Google, Apple, and email uniqueness.

### Step 8. Build Binding and Unbinding APIs

- Implement bind auxiliary identity for a logged-in user.
- Implement unbind auxiliary identity.
- Prevent removing the last primary identity.
- Add audit logs for every bind and unbind operation.

### Step 9. Migrate Existing MVP Login

- Keep `mock-login` only for local or factory test scenarios.
- Move factory test accounts behind non-production flags.
- Replace frontend mock login calls with the new phone or email flows.
- Keep old test behavior covered by explicit tests.

### Step 10. Add Tests and Review

- Unit test normalization, hashing, code verification, and rate limits.
- Integration test China phone login.
- Integration test WeChat bind-phone.
- Integration test US and Europe email login.
- Integration test Google and Apple bind-email.
- Test duplicate binding and conflict errors.
- Test logout, refresh, suspended user, and deleted user behavior.

### Step 11. Frontend Rollout

- China build: phone verification login as the primary entry.
- China build: WeChat quick login as auxiliary entry.
- US and Europe builds: email verification login as the primary entry.
- US and Europe builds: Google and Apple quick login as auxiliary entries.
- Add login state restore with `GET /api/users/me`.
- Add logout and session expiry handling.

### Step 12. Operational Rollout

- Deploy region by region.
- Confirm each region points only to its own data center.
- Confirm production secrets are configured per region.
- Confirm SMS and email templates are approved.
- Confirm auth logs are searchable by region and user.
- Prepare support playbook for bind conflicts, phone changes, email changes, and third-party unbinds.
