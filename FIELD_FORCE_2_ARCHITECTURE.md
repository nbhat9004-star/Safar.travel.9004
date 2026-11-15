# SafarCurated Field Force 2.0

All work is isolated on `feature/field-force-onboarding`. No changes are made to production `main` or SafarOS.

## Employee mobile experience
- Employee authentication uses the existing SafarCurated `/api/auth/login` endpoint and employee role.
- Home dashboard: submitted visit and host-application counts, quick actions, recent visits.
- Host onboarding: captures owner and business contact details, business type, address, description, starting price, employee notes, GPS coordinates and an explicit host-consent confirmation.
- Host applications remain `pending` until Super Admin review. Employees can view their own application status.
- Profile: edit employee name and phone; password recovery uses the existing `/api/auth/forgot-password` email flow.
- Notifications: reads the existing per-user notifications collection.
- Manager support: employees message active managers; managers can message only employees assigned to them.
- Emergency SOS: messages are flagged as emergency and create a priority notification for the recipient.
- Location sharing: opt-in, foreground-only location pings while the app is open, approximately every three minutes. The employee can stop sharing; stopping updates the latest location record immediately.

## Approval workflow
1. Employee records host consent and submits a GPS-stamped application.
2. Application is stored in `hostOnboardingApplications` with status `pending`.
3. Super Admin reviews the application and can approve or return it for changes.
4. On approval, a host account is created (or an existing host account is linked), a password-reset email is attempted, and a listing is created as approved.
5. Employee receives an in-app notification.

## Admin controls
- Employee account creation and suspension.
- Manager designation and employee-to-manager assignment.
- Pending host application review.
- GPS visit records and map links.
- Latest opt-in employee location records.
- Emergency SOS inbox.

## API additions
- `/api/employee/onboarding`
- `/api/employee/profile`
- `/api/employee/location`
- `/api/employee/support`
- `/api/admin/field-force/onboarding`
- `/api/admin/field-force/team`
- `/api/admin/field-force/location`
- `/api/admin/field-force/visits`
- `/api/admin/field-force/emergencies`

## Privacy and security
- Employee endpoints require an active employee account.
- Administrative approval, team assignment and monitoring endpoints are role-guarded.
- Employees explicitly enable and disable location sharing. This implementation does not run a background location service; sharing is limited to the open app session.
- Manager access is limited to assigned employees for outbound manager messages.
- Host applications are not activated by the employee; only Super Admin approval triggers host account and listing creation.

## Remaining validation before production
- Run Flutter APK build and install-test on Android.
- Test host approval end-to-end including password reset email and listing visibility.
- Verify live location opt-in/off and stale-location handling.
- Verify manager replies and SOS delivery on real accounts.
- Confirm listing fields and categories match production listing requirements.
- Review privacy wording and local legal requirements for employee location monitoring.
