import Foundation

@MainActor
final class DiscussionsViewModel: ObservableObject {
    @Published private(set) var discussions: [Discussion] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func load() async {
        isLoading = true
        errorMessage = nil

        do {
            discussions = try await apiClient.fetchDiscussions()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Unable to load discussions."
        }

        isLoading = false
    }
}
