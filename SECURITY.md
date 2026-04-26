# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not**
open a public GitHub issue. Instead, report it privately to:

**wolf@ki-sicherheit.jetzt**

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- The version / commit SHA you tested against
- (Optional) A proposed fix or mitigation

We aim to acknowledge reports within **72 hours** and to provide a status
update within **7 days**. Responsible disclosure is appreciated; please give
us a reasonable window to ship a fix before any public disclosure.

## Scope

This project is a stateless AI-proxy + static-content site. Secrets handling,
the Express API surface (`/api/*`), and the helmet/CORS/rate-limiting
configuration in `server.js` are in scope. Issues in third-party dependencies
should be reported upstream first; we still appreciate a heads-up if a
vulnerable version ships in this repo.

## Supported Versions

The `main` branch is the only supported version. Please verify against the
latest commit before reporting.
