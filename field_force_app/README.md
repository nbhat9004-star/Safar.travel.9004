# SafarCurated Field Force Android App

This is a separate employee-only Flutter app. It does not modify the consumer app in `safar_app/`.

## Authentication
Employees are created by an administrator in SafarCurated Super Admin > Field Force. The app calls the existing `/api/auth/login` endpoint and accepts only active accounts with role `employee`. The returned SafarCurated JWT is used as a Bearer token for employee-only APIs.

## Build
```sh
flutter pub get
flutter create --platforms=android .
flutter pub get
flutter build apk --release --dart-define=SAFAR_API_BASE=https://safarcurated.com/api
```

Location permission is required to submit a visit. The app records the device's current GPS coordinates alongside host details.
