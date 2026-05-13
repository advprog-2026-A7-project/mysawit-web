# Real E2E Integration

This Selenium suite clicks the real frontend and forwards every frontend API call to real backend services. It does not mock backend responses.

## Run

Start the real backend services first, then run:

```bash
npm run test:e2e:real
```

By default it expects local services:

```txt
identity    http://localhost:8081
plantation  http://localhost:8082
harvest     http://localhost:8083
shipment    http://localhost:8084
payroll     http://localhost:8085
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

The runner starts the frontend on `http://127.0.0.1:3100` and a recording proxy on `http://127.0.0.1:3999`.

## What It Verifies

- Register and login trigger Identity API calls.
- Plantation, harvest, shipment, employee, and payroll UI actions trigger the expected backend routes.
- Created records are readable back from the real backend APIs, which means the real database path is exercised.
- Payroll approve and pay buttons persist status changes through the Payroll backend.

The runner creates test data with an `E2E` prefix and deletes created plantation, harvest, shipment, employee, and payroll records at the end. Identity currently has no delete-user endpoint, so the generated test user remains in the real database.
