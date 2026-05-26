# Real E2E Integration

This Selenium suite clicks the real frontend and forwards every frontend API call to real backend services. It does not mock backend responses.

## Run

Start the real backend services first, then run:

```bash
npm run test:e2e:real
```

For the PRD workflow suite, provide a real default admin account and run:

```bash
REAL_ADMIN_EMAIL=admin@mysawit.com REAL_ADMIN_PASSWORD='...' npm run test:e2e:prd
```

`test:e2e:prd` uses the real browser UI for registration, login, kebun creation,
assignment, harvest upload, harvest approval, admin wallet top-up, and payroll
approval. It talks to the same real Spring Boot service URLs listed below and
intentionally fails if a required backend capability is missing instead of
replacing it with an internal mock.

By default it expects local services:

```txt
identity    http://127.0.0.1:8081
plantation  http://127.0.0.1:8082
harvest     http://127.0.0.1:8083
shipment    http://127.0.0.1:8084
payroll     http://127.0.0.1:8085
```

For deployed/Elastic IP services, set these before running:

```bash
REAL_IDENTITY_SERVICE_URL=http://100.30.150.187:8081
REAL_PLANTATION_SERVICE_URL=http://54.144.33.88:8082
REAL_HARVEST_SERVICE_URL=http://54.163.238.229:8083
REAL_PAYROLL_SERVICE_URL=http://18.205.109.188:8085
```

Shipment is included in the test too:

```bash
REAL_SHIPMENT_SERVICE_URL=http://<shipment-host>:8084
```

The PRD runner starts the frontend on `http://127.0.0.1:3102` by default. Override
it with `E2E_FRONTEND_PORT` if that port is already in use.

All services must pass their health preflight. If one service is down, the suite fails immediately instead of falling back to mocks.

For admin pages, the suite can either log in with a real admin account:

```bash
REAL_ADMIN_EMAIL=admin@mysawit.com REAL_ADMIN_PASSWORD='...' npm run test:e2e:real
```

Or, if those variables are not provided, it signs an admin JWT with `REAL_JWT_SECRET`/`JWT_SECRET` and uses that only for admin page authorization checks. The backend calls are still sent to the real services.

## What It Verifies

- Register and login trigger real Identity API calls for BURUH, MANDOR, and SUPIR.
- Worker pages call real Harvest, Payroll, and Shipment APIs.
- Mandor pages call real Plantation, Harvest, Shipment, Payroll, and Identity APIs.
- Admin pages call real Identity, Plantation, Shipment, Payroll, wage config, and dashboard APIs.
- Every asserted call must return the expected real backend HTTP status.

The PRD runner creates temporary Identity users with an `e2e_` prefix, two
plantations, a harvest report, and payroll/wallet records generated from the real
service flow. It deletes the users and plantations at the end through real admin
endpoints. Use an isolated test database when asserting wallet balances or event
side effects.
