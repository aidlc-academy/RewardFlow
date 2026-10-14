---
inclusion: always
---

# RewardFlow Project Steering

## Project Context
This is the RewardFlow — Smart Customer Loyalty and Rewards Engine project for the AWS Kiro AI-DLC Challenge (Project #37).

## Architecture
- Backend: Node.js + Express on port 5000, `c:\Kiro Project\backend\`
- Frontend: React + Vite on port 5173, `c:\Kiro Project\frontend\`
- Database: SQLite at `c:\Kiro Project\backend\data\rewardflow.db`

## Critical Business Rules
- 1 point per ₹10 spent (floor division)
- 10 points = ₹1 redemption discount
- Minimum redemption: 100 points
- When redemption applied to purchase, calculate points on net amount (total - discount)
- Never allow negative point balances
- All reward calculations on backend only

## Currency
Use Indian Rupees (₹) throughout the application.

## Coding Standards
- Use JavaScript (not TypeScript)
- Keep services pure and testable
- Use SQLite transactions for any operation touching point balances
- All API routes return JSON
- Error responses: { "error": "message" }
- Success responses: { "data": ... } or direct object

## Testing
- Test files in `backend/tests/`
- Run with: `npm test` (uses vitest with --run flag)
- Do not use watch mode

## Seed Data
- Run seed with: `node src/db/seed.js` from backend directory
- Seed is safe to re-run (uses INSERT OR IGNORE)
