import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decoding(Error)
    case authenticationFailed
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The API URL is invalid."
        case .invalidResponse:
            return "The API response was invalid."
        case .httpError(let statusCode):
            return "Request failed with status code \(statusCode)."
        case .decoding(let error):
            return "Response decoding failed: \(error.localizedDescription)"
        case .authenticationFailed:
            return "Login failed. Please verify email and password."
        case .transport(let error):
            return error.localizedDescription
        }
    }
}
