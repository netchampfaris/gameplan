import SwiftUI

struct LoginAttemptResult {
    let errorMessage: String?
    let debugResponse: String?
}

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var debugResponse = ""
    let onLogin: (String, String) async -> LoginAttemptResult

    private var canSubmit: Bool {
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !password.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !isLoading
    }

    var body: some View {
        Form {
            Section("Authentication") {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                SecureField("Password", text: $password)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }

                Button(isLoading ? "Signing in…" : "Continue") {
                    Task {
                        isLoading = true
                        let result = await onLogin(email, password)
                        errorMessage = result.errorMessage
                        debugResponse = result.debugResponse ?? ""
                        isLoading = false
                    }
                }
                .disabled(!canSubmit)
            }

            if !debugResponse.isEmpty {
                Section("Debug response") {
                    ScrollView {
                        Text(debugResponse)
                            .font(.caption)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxHeight: 180)
                }
            }

            Section("Notes") {
                Text("Uses Frappe session cookie authentication (sid).")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Sign in")
    }
}

#Preview {
    NavigationStack {
        LoginView { _, _ in
            LoginAttemptResult(errorMessage: nil, debugResponse: "{\"message\":\"Logged In\"}")
        }
    }
}
