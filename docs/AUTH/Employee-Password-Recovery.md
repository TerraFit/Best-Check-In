# Employee SMS Password Recovery

FastCheckIn employees recover access with their registered phone number using a short-lived one-time verification code.

## Flow

1. Employee selects **Forgot password?** from the unified `/login` page.
2. They enter their work phone number.
3. `employee-password-reset-request` creates a 6-digit OTP hash valid for 10 minutes and sends the code by SMS.
4. Employee enters the OTP and chooses a new password.
5. `employee-password-reset-confirm` verifies the single-use challenge, updates `employees.password_hash`, and invalidates outstanding challenges.

Business users continue to use the existing email reset flow.

## Required Netlify environment variables

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Existing `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are also required.

## Database

Apply `docs/migrations/015_employee_password_recovery.sql` before enabling the employee recovery flow in production.

The OTP itself is never stored. Only a SHA-256 hash, expiry, attempt count, and single-use timestamp are persisted.

## Abuse controls

- Generic response for unknown/inactive employee accounts to avoid account enumeration.
- Maximum 3 recovery challenges per employee in 15 minutes.
- Maximum 5 verification attempts per challenge.
- OTP expires after 10 minutes.
- Successful reset invalidates the current and all other outstanding employee reset challenges.
