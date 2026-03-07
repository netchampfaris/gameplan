# Gameplan iOS (SwiftUI)

Native iOS starter app for Gameplan using SwiftUI.

## What is included

- SwiftUI app target (`Gameplan`)
- Unit test target (`GameplanTests`)
- Starter auth gate (`LoginView`)
- Discussions list screen with async loading
- Network layer scaffold for Frappe API calls
- Environment config through `Config.xcconfig`

## Project generation

This boilerplate uses [XcodeGen](https://github.com/yonaskolb/XcodeGen) so the
`.xcodeproj` stays generated and reproducible.

1. Install XcodeGen (if needed):

   ```bash
   brew install xcodegen
   ```

2. Generate the project:

   ```bash
   cd ios
   xcodegen generate
   ```

3. Open in Xcode:

   ```bash
   open GameplanIOS.xcodeproj
   ```

## Configuration

- API base URL is set in `Gameplan/Resources/Config.xcconfig`:

  ```
   API_BASE_URL = http://127.0.0.1:8000
   FRAPPE_SITE_NAME = gameplan.frappe.test
  ```

- For local Frappe development on the iOS simulator, the app connects to
   `127.0.0.1:8000` and sends `X-Frappe-Site-Name` so Frappe can resolve the
   correct site.
- Update these values per environment (local/staging/production).

## Next steps

- Enhance the current email/password login UX (validation, forgot password, loading states).
- Persist and restore authenticated session state for cold app launches.
- Expand feature modules (spaces, comments, pages, tasks) using the same
  view-model + network pattern.
