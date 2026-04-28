# Web Frontend

Back-office web application for user and superadmin log monitoring.

## Features

- JWT login via Web BFF
- Role-aware routing
- User log view (`/my-logs`)
- Superadmin dashboard (`/dashboard`)
- Queryable all-logs panel for superadmins

## Run Locally

1. Install dependencies:

   npm install

2. Configure environment:

   copy .env.example .env

3. Start dev server:

   npm run dev

By default the app expects Web BFF at `http://localhost:3104`.

## Build

npm run build
