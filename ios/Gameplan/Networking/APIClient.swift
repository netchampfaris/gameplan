import Foundation
import os

struct APIClient {
    private static let logger = Logger(subsystem: "io.frappe.gameplan", category: "network")

    private static func errorLog(_ message: String) {
        logger.error("\(message, privacy: .public)")
        NSLog("[Gameplan][network][error] %@", message)
#if DEBUG
        print("[Gameplan][network][error] \(message)")
#endif
    }

    private let baseURL: URL
    private let siteName: String
    private let session: URLSession

    init(baseURL: URL, siteName: String = AppConfig.frappeSiteName, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.siteName = siteName
        self.session = session
    }

    func login(email: String, password: String) async throws -> String {
        guard let url = URL(string: "/api/method/login", relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        applyCommonHeaders(to: &request)

        let body = "usr=\(urlEncode(email))&pwd=\(urlEncode(password))"
        request.httpBody = body.data(using: .utf8)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            Self.errorLog("❌ Login transport error: \(error.localizedDescription)")
            throw APIError.transport(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let responseText = String(data: data, encoding: .utf8) ?? "<non-utf8 response body>"
            Self.errorLog("❌ Login failed \(httpResponse.statusCode) body=\(responseText)")
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        guard hasAuthenticatedSessionCookie() else {
            let sidValue = currentSIDValue() ?? "<missing>"
            Self.errorLog("❌ Login succeeded without authenticated sid cookie sid=\(sidValue)")
            throw APIError.authenticationFailed
        }

        return String(data: data, encoding: .utf8) ?? "<non-utf8 response body>"
    }

    func logout() async {
        guard let url = URL(string: "/api/method/logout", relativeTo: baseURL) else {
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        applyCommonHeaders(to: &request)

        do {
            _ = try await session.data(for: request)
        } catch {
            Self.errorLog("❌ Logout transport error: \(error.localizedDescription)")
        }

        clearSessionCookie()
    }

    func fetchDiscussions() async throws -> [Discussion] {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw APIError.invalidURL
        }

        components.percentEncodedPath = "/api/v2/method/gameplan.gameplan.doctype.gp_discussion.api.get_discussions"

        components.queryItems = [
            URLQueryItem(name: "order_by", value: "last_post_at desc"),
            URLQueryItem(name: "limit", value: "20")
        ]

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        applyCommonHeaders(to: &request)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            Self.errorLog("❌ Fetch discussions transport error: \(error.localizedDescription)")
            throw APIError.transport(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let responseText = String(data: data, encoding: .utf8) ?? "<non-utf8 response body>"
            Self.errorLog("❌ Fetch discussions failed \(httpResponse.statusCode) body=\(responseText)")
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        do {
            return try JSONDecoder().decode(ListResponse<Discussion>.self, from: data).data
        } catch {
            let responseText = String(data: data, encoding: .utf8) ?? "<non-utf8 response body>"
            Self.errorLog("❌ Decode discussions failed body=\(responseText)")
            Self.errorLog("❌ Decode discussions failed: \(error.localizedDescription)")
            throw APIError.decoding(error)
        }
    }

    private func hasAuthenticatedSessionCookie() -> Bool {
        let cookies = HTTPCookieStorage.shared.cookies(for: baseURL) ?? []
        return cookies.contains(where: { $0.name == "sid" && !$0.value.isEmpty && $0.value != "Guest" })
    }

    private func currentSIDValue() -> String? {
        let cookies = HTTPCookieStorage.shared.cookies(for: baseURL) ?? []
        return cookies.first(where: { $0.name == "sid" })?.value
    }

    private func applyCommonHeaders(to request: inout URLRequest) {
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(siteName, forHTTPHeaderField: "X-Frappe-Site-Name")
        if request.value(forHTTPHeaderField: "Content-Type") == nil {
            request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        }

        let cookies = HTTPCookieStorage.shared.cookies(for: baseURL) ?? []
        if !cookies.isEmpty {
            let cookieHeaders = HTTPCookie.requestHeaderFields(with: cookies)
            for (header, value) in cookieHeaders {
                request.setValue(value, forHTTPHeaderField: header)
            }
        }
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
