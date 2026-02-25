import SwiftUI

struct RootView: View {
    private let apiClient = APIClient(baseURL: AppConfig.apiBaseURL)
    @State private var session = UserSession()

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
                        let response = try await apiClient.login(email: email, password: password)
                        session.login(email: email)
                        return LoginAttemptResult(errorMessage: nil, debugResponse: response)
                    } catch {
                        return LoginAttemptResult(
                            errorMessage: (error as? LocalizedError)?.errorDescription ?? "Login failed.",
                            debugResponse: nil
                        )
                    }
                }
            }
        }
    }
}

#Preview {
    RootView()
}
