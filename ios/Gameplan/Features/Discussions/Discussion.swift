import Foundation

struct Discussion: Decodable, Identifiable {
    let id: String
    let title: String
    let modifiedAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "name"
        case title
        case modifiedAt = "modified"
    }
}
