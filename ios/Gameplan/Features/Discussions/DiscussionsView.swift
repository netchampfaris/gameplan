import SwiftUI
import UIKit

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
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(viewModel.discussions.enumerated()), id: \.element.id) { index, discussion in
                            VStack(spacing: 0) {
                                DiscussionRowView(
                                    discussion: discussion,
                                    owner: viewModel.user(for: discussion.owner),
                                    lastPoster: viewModel.user(for: discussion.lastPostBy),
                                    apiClient: viewModel.mediaClient
                                )

                                if index < viewModel.discussions.count - 1 {
                                    Divider()
                                        .padding(.leading, 70)
                                }
                            }
                        }
                    }
                    .background(Color.white)
                }
                .background(Color.white)
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

private struct DiscussionRowView: View {
    let discussion: Discussion
    let owner: UserInfo?
    let lastPoster: UserInfo?
    let apiClient: APIClient

    private var metadataLabel: String {
        let author = DiscussionFormatting.displayName(for: lastPoster, fallbackIdentifier: discussion.lastPostBy ?? discussion.owner)

        if let projectTitle = discussion.projectTitle, !projectTitle.isEmpty {
            return "\(author) in \(projectTitle)"
        }

        return author
    }

    private var timestampLabel: String {
        DiscussionFormatting.relativeTimestamp(from: discussion.lastActivityAt)
    }

    private var timestampAccessibilityLabel: String? {
        DiscussionFormatting.absoluteTimestamp(from: discussion.lastActivityAt)
    }

    private var metadataSymbolName: String {
        if discussion.closedAt != nil {
            return "lock"
        }

        switch discussion.lastPostType {
        case .poll:
            return "chart.bar.xaxis"
        case .comment, .none:
            return "arrowshape.turn.up.left"
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            DiscussionUserAvatar(user: owner, fallbackIdentifier: discussion.owner, apiClient: apiClient)

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(discussion.title)
                        .font(.headline)
                        .fontWeight(discussion.unread > 0 ? .semibold : .regular)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    if discussion.unread > 0 {
                        Circle()
                            .fill(Color.orange)
                            .frame(width: 8, height: 8)
                    }

                    Spacer(minLength: 0)
                }

                HStack(spacing: 6) {
                    Image(systemName: metadataSymbolName)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)

                    Text(metadataLabel)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Text(discussion.previewText)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer(minLength: 12)

            VStack(alignment: .trailing, spacing: 10) {
                Text(timestampLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .accessibilityLabel(timestampAccessibilityLabel ?? timestampLabel)

                HStack(spacing: 8) {
                    DiscussionCountBadge(
                        value: discussion.unread > 0 ? discussion.unread : max(discussion.commentsCount + 1, 1),
                        emphasized: discussion.unread > 0
                    )
                }
            }
        }
        .padding(14)
        .background(Color.white)
    }
}

private struct DiscussionUserAvatar: View {
    let user: UserInfo?
    let fallbackIdentifier: String
    let apiClient: APIClient

    @State private var loadedImage: UIImage?

    private var imageURL: URL? {
        guard let raw = user?.userImage, !raw.isEmpty else {
            return nil
        }

        return URL(string: raw)
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(DiscussionFormatting.avatarColor(for: user, fallbackIdentifier: fallbackIdentifier))

            if let loadedImage {
                Image(uiImage: loadedImage)
                    .resizable()
                    .scaledToFill()
                    .clipShape(Circle())
            } else {
                Text(DiscussionFormatting.initials(for: user?.fullName ?? fallbackIdentifier))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 44, height: 44)
        .accessibilityLabel(DiscussionFormatting.displayName(for: user, fallbackIdentifier: fallbackIdentifier))
        .task(id: imageURL) {
            await loadImage()
        }
    }

    private func loadImage() async {
        guard let imageURL else {
            avatarDebugLog("No avatar URL for user=\(user?.name ?? fallbackIdentifier)")
            loadedImage = nil
            return
        }

        do {
            avatarDebugLog("Loading avatar user=\(user?.name ?? fallbackIdentifier) url=\(imageURL.absoluteString)")
            let data = try await apiClient.fetchImageData(from: imageURL)
            if let image = UIImage(data: data) {
                loadedImage = image
                avatarDebugLog("Decoded avatar image user=\(user?.name ?? fallbackIdentifier) bytes=\(data.count)")
            } else {
                loadedImage = nil
                avatarDebugLog("Failed to decode avatar image user=\(user?.name ?? fallbackIdentifier) bytes=\(data.count)")
            }
        } catch {
            loadedImage = nil
            avatarDebugLog("Avatar load failed user=\(user?.name ?? fallbackIdentifier) error=\(error.localizedDescription)")
        }
    }

    private func avatarDebugLog(_ message: String) {
#if DEBUG
        NSLog("[Gameplan][avatar][debug] %@", message)
        print("[Gameplan][avatar][debug] \(message)")
#endif
    }
}

private struct DiscussionCountBadge: View {
    let value: Int
    let emphasized: Bool

    var body: some View {
        Text("\(value)")
            .font(.caption.weight(.semibold))
            .foregroundStyle(emphasized ? .white : .secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(emphasized ? Color.orange : Color(uiColor: .tertiarySystemFill))
            .clipShape(Capsule())
            .accessibilityLabel(emphasized ? "\(value) unread" : "\(value) posts")
    }
}

#Preview {
    NavigationStack {
        DiscussionsView(viewModel: DiscussionsViewModel(apiClient: APIClient(baseURL: AppConfig.apiBaseURL)))
    }
}
