# Security Policy

## Reporting a Vulnerability

Please do **not** open a public issue for security vulnerabilities.

Instead, report privately via **GitHub Security Advisories**:

1. Go to: **Security** &rarr; **Report a vulnerability**
2. Describe the issue, including:
   - Affected endpoint, component, or file
   - Steps to reproduce
   - Expected vs actual behavior
   - Impact (e.g. XSS, IDOR, privilege escalation, data leak)

We aim to acknowledge reports within 48 hours and will coordinate a responsible
disclosure timeline before any public fix announcement.

## Scope

- The public portfolio and its API integration (`src/**`)
- The admin panel (`/admin`)
- Authentication / session handling
- The backend API (`hono-workers`) is out of scope for this repository; report
  it separately.

## Private Data Notice

The admin panel contains a **family tree module with real personal data**.
Treat any data you encounter while testing as private — do not share names,
birth dates, or relationships outside of the fix discussion.