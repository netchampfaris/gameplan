import Foundation
import os

struct APIClient {
    private static let logger = Logger(subsystem: "io.frappe.gameplan", category: "network")

    private static func debugLog(_ message: String) {
        logger.debug("\(message, privacy: .public)")
#if DEBUG
        print("[Gameplan][network] \(message)")
#endif
    }

    private static func errorLog(_ message: String) {
        logger.error("\(message, privacy: .public)")
#if DEBUG
        print("[Gameplan][network][error] \(message)")
#endif
    }

    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    func login(email: String, password: String) async throws -> String {
        guard let url = URL(string: "/api/v2/method/login", relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        Self.debugLog("➡️ POST \(url.absoluteString) login usr=<redacted>")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = "usr=\(urlEncode(email))&pwd=\(urlEncode(password))"
        request.httpBody = body.data(using: .utf8)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        Self.debugLog("⬅️ \(httpResponse.statusCode) \(url.absoluteString)")

        guard (200..<300).contains(httpResponse.statusCode) else {
            let responseText = String(data: data, encoding: .utf8) ?? "<non-utf8 response body>"
            Self.errorLog("❌ Login failed \(httpResponse.statusCode) body=\(responseText)")
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        guard hasSessionCookie() else {
            Self.errorLog("❌ Login succeeded without sid cookie")
            throw APIError.authenticationFailed
        }

        let responseText = String(data: data, encoding: .utf8) ?? "<non-utf8 response body>"
        Self.debugLog("✅ Login response body=\(responseText)")
        return responseText
    }

    func logout() async {
        guard let url = URL(string: "/api/v2/method/logout", relativeTo: baseURL) else {
            return
        }

        Self.debugLog("➡️ POST \(url.absoluteString) logout")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (_, response) = (try? await session.data(for: request)) ?? (Data(), nil)
        if let httpResponse = response as? HTTPURLResponse {
            Self.debugLog("⬅️ \(httpResponse.statusCode) \(url.absoluteString)")
        }
        clearSessionCookie()
        Self.debugLog("✅ Cleared sid cookie")
    }

    func fetchDiscussions() async throws -> [Discussion] {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw APIError.invalidURL
        }

        components.percentEncodedPath = "/api/v2/document/GP%20Discussion"

        components.queryItems = [
            URLQueryItem(name: "fields", value: "[\"name\",\"title\",\"modified\"]"),
            URLQueryItem(name: "order_by", value: "modified desc"),
            URLQueryItem(name: "limit", value: "20")
        ]

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        Self.debugLog("➡️ GET \(url.absoluteString)")

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        Self.debugLog("⬅️ \(httpResponse.statusCode) \(url.absoluteString)")

        guard (200..<300).contains(httpResponse.statusCode) else {
            let responseText = String(data: data, encoding: .utf8) ?? "<non-utf8 response body>"
            Self.errorLog("❌ Fetch discussions failed \(httpResponse.statusCode) body=\(responseText)")
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        do {
            let decoded = try JSONDecoder().decode(ListResponse<Discussion>.self, from: data).data
            Self.debugLog("✅ Loaded discussions count=\(decoded.count)")
            return decoded
        } catch {
            Self.errorLog("❌ Decode discussions failed: \(error.localizedDescription)")
            throw APIError.decoding(error)
        }
    }

    private func hasSessionCookie() -> Bool {
        let cookies = HTTPCookieStorage.shared.cookies(for: baseURL) ?? []
        return cookies.contains(where: { $0.name == "sid" && !$0.value.isEmpty })
    }

    private func clearSessionCookie() {
        let cookies = HTTPCookieStorage.shared.cookies(for: baseURL) ?? []
        cookies
            .filter { $0.name == "sid" }
            .forEach { HTTPCookieStorage.shared.deleteCookie($0) }
    }

    private func urlEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }
}

private struct ListResponse<T: Decodable>: Decodable {
    let data: [T]
}
