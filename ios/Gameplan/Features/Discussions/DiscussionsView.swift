import SwiftUI

struct DiscussionsView: View {
    @StateObject private var viewModel: DiscussionsViewModel

    init(viewModel: DiscussionsViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading discussions…")
            } else if let errorMessage = viewModel.errorMessage {
                ContentUnavailableView("Could not load discussions", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
            } else if viewModel.discussions.isEmpty {
                ContentUnavailableView("No discussions yet", systemImage: "bubble.left.and.bubble.right")
            } else {
                List(viewModel.discussions) { discussion in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(discussion.title)
                            .font(.headline)
                        if let modifiedAt = discussion.modifiedAt {
                            Text(modifiedAt)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Gameplan")
        .task {
            await viewModel.load()
        }
        .refreshable {
            await viewModel.load()
        }
    }
}
