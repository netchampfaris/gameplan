import Foundation

enum AppConfig {
    static var apiBaseURL: URL {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
            let url = URL(string: raw)
        else {
            return URL(string: "http://127.0.0.1:8000")!
        }
        return url
    }

    static var frappeSiteName: String {
        (Bundle.main.object(forInfoDictionaryKey: "FRAPPE_SITE_NAME") as? String)
            ?? "gameplan.frappe.test"
    }

    static var siteAssetBaseURL: URL {
        guard var components = URLComponents(url: apiBaseURL, resolvingAgainstBaseURL: false) else {
            return apiBaseURL
        }

        if let siteComponents = URLComponents(string: "http://\(frappeSiteName)") {
            components.host = siteComponents.host
            if let explicitPort = siteComponents.port {
                components.port = explicitPort
            }
        } else {
            components.host = frappeSiteName
        }

        return components.url ?? apiBaseURL
    }
}
