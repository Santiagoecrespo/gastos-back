# SplitWise

Web app for splitting group expenses and collecting transfers from local wallets.

## Production setup

The frontend is deployed from `frontend/` on Vercel. Set `VITE_API_URL` there to
the public FastAPI backend URL. The backend needs `DATABASE_URL`, `SECRET_KEY`
and the SMTP variables documented in [`.env.example`](.env.example).

Email sign-in is intentionally passwordless: `/auth/request-code` emails a
six-digit code and `/auth/verify-code` creates or verifies the account only
after the mailbox owner enters it. Do not deploy without SMTP configured; the
API returns an explicit error instead of pretending that an email was sent.

## Local development

```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload

cd frontend
npm install
npm run dev
```

For a local email test, use a development SMTP inbox (such as Mailpit) and set
the same SMTP variables before starting the backend.
