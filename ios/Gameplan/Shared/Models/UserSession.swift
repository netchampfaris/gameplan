import Foundation

struct UserSession {
    private static let emailDefaultsKey = "gameplan.session.email"

    private(set) var email: String?

    init(email: String? = nil) {
        self.email = email
    }

    var isAuthenticated: Bool {
        guard let email else { return false }
        return !email.isEmpty
    }

    static func restore(hasAuthenticatedSession: Bool) -> UserSession {
        guard hasAuthenticatedSession else {
            UserDefaults.standard.removeObject(forKey: emailDefaultsKey)
            return UserSession()
        }

        let savedEmail = UserDefaults.standard.string(forKey: emailDefaultsKey)
        return UserSession(email: savedEmail)
    }

    mutating func login(email: String) {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        self.email = normalizedEmail
        UserDefaults.standard.set(normalizedEmail, forKey: Self.emailDefaultsKey)
    }

    mutating func logout() {
        email = nil
        UserDefaults.standard.removeObject(forKey: Self.emailDefaultsKey)
    }
}
