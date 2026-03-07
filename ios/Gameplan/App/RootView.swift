import SwiftUI

struct RootView: View {
    private let apiClient: APIClient
    @State private var session: UserSession

    init() {
        let apiClient = APIClient(baseURL: AppConfig.apiBaseURL)
        self.apiClient = apiClient
        _session = State(initialValue: UserSession.restore(hasAuthenticatedSession: apiClient.hasAuthenticatedSession()))
    }

    var body: some View {
        NavigationStack {
            if session.isAuthenticated {
                DiscussionsView(viewModel: DiscussionsViewModel(apiClient: apiClient))
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Logout") {
                                Task {
                                    await apiClient.logout()
                                    session.logout()
                                }
                            }
                        }
                    }
            } else {
                LoginView { email, password in
                    do {
                        _ = try await apiClient.login(email: email, password: password)
                        session.login(email: email)
                        return LoginAttemptResult(errorMessage: nil)
                    } catch {
                        return LoginAttemptResult(errorMessage: error.localizedDescription)
                    }
                }
            }
        }
    }
}

#Preview {
    RootView()
}
