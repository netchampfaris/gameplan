import Foundation
import SwiftUI

struct UserInfo: Decodable, Identifiable {
    let name: String
    let email: String?
    let enabled: Int?
    let userImage: String?
    let fullName: String?
    let userType: String?
    let userProfile: String?
    let imageBackgroundColor: String?
    let isImageBackgroundRemoved: Int?
    let discussionsCount3m: Int?
    let commentsCount3m: Int?
    let bio: String?
    let role: String?

    var id: String { name }

    enum CodingKeys: String, CodingKey {
        case name
        case email
        case enabled
        case userImage = "user_image"
        case fullName = "full_name"
        case userType = "user_type"
        case userProfile = "user_profile"
        case imageBackgroundColor = "image_background_color"
        case isImageBackgroundRemoved = "is_image_background_removed"
        case discussionsCount3m = "discussions_count_3m"
        case commentsCount3m = "comments_count_3m"
        case bio
        case role
    }

    func resolved(baseURL: URL) -> UserInfo {
        guard let userImage, !userImage.isEmpty else {
            return self
        }

        guard let resolvedURL = Self.resolveAssetURL(userImage, baseURL: baseURL) else {
            return self
        }

        return UserInfo(
            name: name,
            email: email,
            enabled: enabled,
            userImage: resolvedURL.absoluteString,
            fullName: fullName,
            userType: userType,
            userProfile: userProfile,
            imageBackgroundColor: imageBackgroundColor,
            isImageBackgroundRemoved: isImageBackgroundRemoved,
            discussionsCount3m: discussionsCount3m,
            commentsCount3m: commentsCount3m,
            bio: bio,
            role: role
        )
    }

    private static func resolveAssetURL(_ rawValue: String, baseURL: URL) -> URL? {
        let assetBaseURL = AppConfig.siteAssetBaseURL

        if let directURL = URL(string: rawValue), directURL.host == nil {
            return URL(string: rawValue, relativeTo: assetBaseURL)?.absoluteURL
        }

        guard let parsedURL = URL(string: rawValue) else {
            return URL(string: rawValue, relativeTo: assetBaseURL)?.absoluteURL
        }

        let localAssetPrefixes = ["/files/", "/private/files/"]
        if localAssetPrefixes.contains(where: { parsedURL.path.hasPrefix($0) }) {
            guard var components = URLComponents(url: parsedURL, resolvingAgainstBaseURL: false),
                  let assetBaseComponents = URLComponents(url: assetBaseURL, resolvingAgainstBaseURL: false) else {
                return URL(string: rawValue, relativeTo: assetBaseURL)?.absoluteURL
            }

            components.scheme = assetBaseComponents.scheme
            components.host = assetBaseComponents.host
            components.port = assetBaseComponents.port
            return components.url
        }

        if parsedURL.host == baseURL.host || parsedURL.host == assetBaseURL.host {
            guard var components = URLComponents(url: parsedURL, resolvingAgainstBaseURL: false),
                  let assetBaseComponents = URLComponents(url: assetBaseURL, resolvingAgainstBaseURL: false) else {
                return parsedURL
            }

            components.scheme = assetBaseComponents.scheme
            components.host = assetBaseComponents.host
            components.port = assetBaseComponents.port
            return components.url
        }

        return parsedURL
    }
}

struct Discussion: Decodable, Identifiable {
    let name: String
    let id: String
    let title: String
    let owner: String
    let project: String
    let projectTitle: String?
    let slug: String?
    let creation: String?
    let modifiedAt: String?
    let lastPostAt: String?
    let lastPostBy: String?
    let lastPostType: LastPostType?
    let lastCommentContent: String?
    let lastPollTitle: String?
    let commentsCount: Int
    let unread: Int
    let closedAt: String?
    let ongoingPolls: [DiscussionPoll]

    enum LastPostType: String, Decodable {
        case comment = "GP Comment"
        case poll = "GP Poll"
    }

    struct DiscussionPoll: Decodable, Identifiable {
        let id: String
        let owner: String?

        enum CodingKeys: String, CodingKey {
            case id = "name"
            case owner
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            id = try container.decodeLossyString(forKey: .id)
            owner = try? container.decodeIfPresent(String.self, forKey: .owner)
        }
    }

    var previewText: String {
        let preview = lastCommentContent ?? lastPollTitle
        let trimmedPreview = preview?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmedPreview.isEmpty ? "No preview available" : trimmedPreview
    }

    var lastActivityAt: String? {
        lastPostAt ?? creation ?? modifiedAt
    }

    enum CodingKeys: String, CodingKey {
        case id = "name"
        case title
        case owner
        case project
        case projectTitle = "project_title"
        case slug
        case creation
        case modifiedAt = "modified"
        case lastPostAt = "last_post_at"
        case lastPostBy = "last_post_by"
        case lastPostType = "last_post_type"
        case lastCommentContent = "last_comment_content"
        case lastPollTitle = "last_poll_title"
        case commentsCount = "comments_count"
        case unread
        case closedAt = "closed_at"
        case ongoingPolls = "ongoing_polls"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        let decodedID = try container.decodeLossyString(forKey: .id)
        name = decodedID
        id = decodedID

        title = (try? container.decode(String.self, forKey: .title)) ?? "Untitled discussion"
        owner = (try? container.decode(String.self, forKey: .owner)) ?? "Unknown"
        project = (try? container.decode(String.self, forKey: .project)) ?? ""
        projectTitle = try? container.decodeIfPresent(String.self, forKey: .projectTitle)
        slug = try? container.decodeIfPresent(String.self, forKey: .slug)
        creation = try? container.decodeIfPresent(String.self, forKey: .creation)
        modifiedAt = try? container.decode(String.self, forKey: .modifiedAt)
        lastPostAt = try? container.decodeIfPresent(String.self, forKey: .lastPostAt)
        lastPostBy = try? container.decodeIfPresent(String.self, forKey: .lastPostBy)
        lastPostType = try? container.decodeIfPresent(LastPostType.self, forKey: .lastPostType)
        lastCommentContent = try? container.decodeIfPresent(String.self, forKey: .lastCommentContent)
        lastPollTitle = try? container.decodeIfPresent(String.self, forKey: .lastPollTitle)
        commentsCount = (try? container.decodeLossyInt(forKey: .commentsCount)) ?? 0
        unread = (try? container.decodeLossyInt(forKey: .unread)) ?? 0
        closedAt = try? container.decodeIfPresent(String.self, forKey: .closedAt)
        ongoingPolls = (try? container.decodeIfPresent([DiscussionPoll].self, forKey: .ongoingPolls)) ?? []
    }
}

private extension KeyedDecodingContainer {
    func decodeLossyString(forKey key: K) throws -> String {
        if let stringValue = try? decode(String.self, forKey: key) {
            return stringValue
        }

        if let intValue = try? decode(Int.self, forKey: key) {
            return String(intValue)
        }

        throw DecodingError.dataCorruptedError(
            forKey: key,
            in: self,
            debugDescription: "Expected a string-compatible value for \(key.stringValue)"
        )
    }

    func decodeLossyInt(forKey key: K) throws -> Int {
        if let intValue = try? decode(Int.self, forKey: key) {
            return intValue
        }

        if let stringValue = try? decode(String.self, forKey: key), let intValue = Int(stringValue) {
            return intValue
        }

        throw DecodingError.dataCorruptedError(
            forKey: key,
            in: self,
            debugDescription: "Expected an integer-compatible value for \(key.stringValue)"
        )
    }
}

enum DiscussionFormatting {
    private static let serverDateFormatters: [DateFormatter] = {
        let formats = [
            "yyyy-MM-dd HH:mm:ss.SSSSSS",
            "yyyy-MM-dd HH:mm:ss.SSS",
            "yyyy-MM-dd HH:mm:ss"
        ]

        return formats.map { format in
            let formatter = DateFormatter()
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = .current
            formatter.dateFormat = format
            return formatter
        }
    }()

    private static let relativeFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter
    }()

    static func relativeTimestamp(from rawValue: String?) -> String {
        guard let date = parseDate(rawValue) else {
            return "Now"
        }

        return relativeFormatter.localizedString(for: date, relativeTo: Date())
    }

    static func absoluteTimestamp(from rawValue: String?) -> String? {
        guard let date = parseDate(rawValue) else {
            return nil
        }

        return date.formatted(date: .abbreviated, time: .shortened)
    }

    static func displayName(for identifier: String?) -> String {
        let rawValue = (identifier ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !rawValue.isEmpty else {
            return "Unknown"
        }

        let baseName = rawValue.split(separator: "@").first.map(String.init) ?? rawValue
        let fragments = baseName
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: ".", with: " ")
            .replacingOccurrences(of: "-", with: " ")
            .split(whereSeparator: { $0.isWhitespace })

        if fragments.isEmpty {
            return rawValue
        }

        return fragments
            .map { fragment in
                fragment.prefix(1).uppercased() + fragment.dropFirst()
            }
            .joined(separator: " ")
    }

    static func displayName(for user: UserInfo?, fallbackIdentifier: String?) -> String {
        let fullName = user?.fullName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !fullName.isEmpty {
            return fullName
        }

        return displayName(for: fallbackIdentifier)
    }

    static func initials(for identifier: String?) -> String {
        let displayName = displayName(for: identifier)
        let components = displayName.split(whereSeparator: { $0.isWhitespace })

        if components.count >= 2 {
            return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
        }

        return String(displayName.prefix(2)).uppercased()
    }

    static func avatarColor(for identifier: String?) -> Color {
        let palette: [Color] = [
            Color(red: 0.33, green: 0.46, blue: 0.80),
            Color(red: 0.21, green: 0.60, blue: 0.55),
            Color(red: 0.73, green: 0.43, blue: 0.31),
            Color(red: 0.55, green: 0.40, blue: 0.72),
            Color(red: 0.78, green: 0.55, blue: 0.24),
            Color(red: 0.32, green: 0.52, blue: 0.52)
        ]

        let hash = identifier?.unicodeScalars.reduce(0, { partialResult, scalar in
            partialResult + Int(scalar.value)
        }) ?? 0

        return palette[abs(hash) % palette.count]
    }

    static func avatarColor(for user: UserInfo?, fallbackIdentifier: String?) -> Color {
        if let hex = user?.imageBackgroundColor,
           let color = Color(hex: hex),
           user?.isImageBackgroundRemoved != 1 {
            return color
        }

        return avatarColor(for: fallbackIdentifier)
    }

    private static func parseDate(_ rawValue: String?) -> Date? {
        guard let rawValue, !rawValue.isEmpty else {
            return nil
        }

        for formatter in serverDateFormatters {
            if let date = formatter.date(from: rawValue) {
                return date
            }
        }

        return ISO8601DateFormatter().date(from: rawValue)
    }
}

private extension Color {
    init?(hex: String) {
        let sanitized = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        guard sanitized.count == 6 || sanitized.count == 8,
              let value = UInt64(sanitized, radix: 16) else {
            return nil
        }

        let red, green, blue, alpha: UInt64
        if sanitized.count == 8 {
            alpha = (value >> 24) & 0xff
            red = (value >> 16) & 0xff
            green = (value >> 8) & 0xff
            blue = value & 0xff
        } else {
            alpha = 0xff
            red = (value >> 16) & 0xff
            green = (value >> 8) & 0xff
            blue = value & 0xff
        }

        self.init(
            .sRGB,
            red: Double(red) / 255,
            green: Double(green) / 255,
            blue: Double(blue) / 255,
            opacity: Double(alpha) / 255
        )
    }
}
