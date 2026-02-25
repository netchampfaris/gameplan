import XCTest
@testable import Gameplan

final class GameplanTests: XCTestCase {
    func testUserSessionLoginAndLogout() {
        var session = UserSession()

        XCTAssertFalse(session.isAuthenticated)
        session.login(email: "test@example.com")
        XCTAssertTrue(session.isAuthenticated)

        session.logout()
        XCTAssertFalse(session.isAuthenticated)
    }
}
