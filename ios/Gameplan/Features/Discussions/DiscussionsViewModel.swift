import Foundation

@MainActor
final class DiscussionsViewModel: ObservableObject {
    @Published private(set) var discussions: [Discussion] = []
    @Published private(set) var usersByName: [String: UserInfo] = [:]
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    var mediaClient: APIClient {
        apiClient
    }

    func load() async {
        isLoading = true
        errorMessage = nil

        do {
            async let fetchedDiscussions = apiClient.fetchDiscussions()
            async let fetchedUsers = apiClient.fetchUsers()

            discussions = try await fetchedDiscussions
            usersByName = Dictionary(uniqueKeysWithValues: try await fetchedUsers.map { ($0.name, $0) })
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Unable to load discussions."
        }

        isLoading = false
    }

    func user(for identifier: String?) -> UserInfo? {
        guard let identifier, !identifier.isEmpty else {
            return nil
        }

        return usersByName[identifier]
    }
}
