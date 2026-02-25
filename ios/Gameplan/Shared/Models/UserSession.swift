import Foundation

struct UserSession {
    private(set) var email: String?

    var isAuthenticated: Bool {
        guard let email else { return false }
        return !email.isEmpty
    }

    mutating func login(email: String) {
        self.email = email.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    mutating func logout() {
        email = nil
    }
}
