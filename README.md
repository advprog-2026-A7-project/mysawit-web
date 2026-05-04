# MySawit Web

Frontend MySawit dibangun dengan Next.js App Router, React, TypeScript, dan Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Gateway

Browser code only calls the frontend gateway under `/api/gateway`. The gateway route proxies requests to each Spring Boot service from the server side:

- `/api/gateway/identity/*` -> Identity service
- `/api/gateway/plantation/*` -> Plantation service
- `/api/gateway/harvest/*` -> Harvest service
- `/api/gateway/shipment/*` -> Shipment service
- `/api/gateway/payroll/*` -> Payroll service

Default service URLs:

```bash
IDENTITY_SERVICE_URL=http://localhost:8081
PLANTATION_SERVICE_URL=http://localhost:8082
HARVEST_SERVICE_URL=http://localhost:8083
SHIPMENT_SERVICE_URL=http://localhost:8084
PAYROLL_SERVICE_URL=http://localhost:8085
```

The gateway also accepts the existing `NEXT_PUBLIC_*_SERVICE_URL` variables as fallback values, but new deployments should prefer the non-public variables above.

## Verification

```bash
npm run lint
npm run type-check
npm test -- --runInBand
npm run build
```
