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

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        if let stringID = try? container.decode(String.self, forKey: .id) {
            id = stringID
        } else if let intID = try? container.decode(Int.self, forKey: .id) {
            id = String(intID)
        } else {
            throw DecodingError.dataCorruptedError(forKey: .id, in: container, debugDescription: "Discussion name must be a string or integer")
        }

        title = (try? container.decode(String.self, forKey: .title)) ?? "Untitled discussion"
        modifiedAt = try? container.decode(String.self, forKey: .modifiedAt)
    }
}
