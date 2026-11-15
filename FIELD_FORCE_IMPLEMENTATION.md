# SafarCurated Field Force — additive implementation

This feature is isolated on `feature/field-force-onboarding`. The existing `main` branch and SafarOS are not modified.

## Access model
- Super Admin/Admin creates employee accounts in `/admin/field-force`.
- Employee identity is stored in the existing SafarCurated `users` collection with role `employee`; no second identity database is introduced.
- Existing SafarCurated email/password login issues the same session cookie and JWT. The employee app must check that the authenticated user has role `employee` and is not suspended before showing employee tools.
- Employee visit endpoints reject all non-employee roles.

## API
- `GET/POST/PATCH /api/admin/field-force`: list, create and suspend/reactivate employee accounts. Admin-only.
- `GET/POST /api/employee/visits`: list the current employee's visits and submit a GPS-stamped onboarding visit.

## Android app
A separate Flutter employee application belongs in `field_force_app/`; do not reuse or alter `safar_app/`, which is the consumer Safar app. Configure its API base URL to the deployed SafarCurated origin. The APK must be built by CI with Flutter and tested on a physical Android device before distribution.

## Safety
- Never grant the employee role through the public registration endpoint.
- Never store plaintext passwords.
- Do not change the existing traveler or host app login labels.
- Review this branch and run the full regression suite before merging.
