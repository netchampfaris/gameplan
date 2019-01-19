<template>
  <div class="page-discussion">
    <back-to-discussions />
    <div v-if="discussion">
      <discussion-post
        :post="discussion"
        :is-original-post="true"
        @delete="deleteDiscussion"
        @update="updateDiscussion"
      />
      <discussion-post
        v-for="comment of comments"
        :key="comment.name"
        :post="comment"
      />
      <create-discussion-post
        :post="userPost"
        :inactive="!addCommentActive"
        @post-value="addComment"
      />
    </div>
  </div>
</template>

<script>
import frappe from 'frappejs'
import BackToDiscussions from '@/components/BackToDiscussions'
import DiscussionPost from '@/components/DiscussionPost'
import CreateDiscussionPost from '@/components/CreateDiscussionPost'

export default {
  name: 'Discussion',
  props: ['name'],
  components: {
    BackToDiscussions,
    DiscussionPost,
    CreateDiscussionPost,
  },
  data() {
    return {
      discussion: null,
      comments: [],
      userPost: {
        content: '',
        owner: frappe.session ? frappe.session.fullName : 'Guest',
      },
      addCommentActive: false,
    }
  },
  async created() {
    const discussion = await frappe.getDoc('DiscussionBoard', this.name)
    this.comments = await this.getComments(this.name)

    let attachments = await frappe.db.getAll({
      doctype: 'File',
      fields: ['name', 'filename', 'mimetype', 'size'],
      filters: {
        referenceDoctype: 'DiscussionBoard',
        referenceName: this.name,
      },
    })
    discussion.attachments = attachments
    this.discussion = discussion
  },
  methods: {
    async addComment(title, content, attachments) {
      const doc = frappe.newDoc({
        doctype: 'DiscussionBoardMessage',
        creation: new Date().toISOString(),
        owner: frappe.session.user,
        discussionBoard: this.discussion.name,
        content,
        attachments,
      })

      await doc.insert()
      this.addNewComment(doc)
      this.addCommentActive = false
    },
    async addNewComment(comment) {
      let newComment = comment
      let commentAttachments = await frappe.db.getAll({
        doctype: 'File',
        fields: ['name', 'filename', 'mimetype', 'size'],
        filters: {
          referenceDoctype: 'DiscussionBoardMessage',
          referenceName: comment.name,
        },
      })
      newComment.attachments = commentAttachments
      this.comments.push(newComment)
    },
    async deleteDiscussion() {
      await frappe.db.delete('DiscussionBoard', this.name)
      this.$router.push('/discussions')
    },
    async updateDiscussion(value) {
      if (value.title) {
        this.discussion.set('title', value.title)
      }
      if (value.content) {
        this.discussion.set('content', value.content)
      }
      await this.discussion.update()
    },
    async getComments(discussionName) {
      let comments = await frappe.db.getAll({
        doctype: 'DiscussionBoardMessage',
        fields: ['name', 'content', 'owner', 'creation', 'modified'],
        filters: {
          discussionBoard: discussionName,
        },
        orderBy: 'creation',
        order: 'asc',
      })

      comments.forEach(async comment => {
        let commentAttachments = await frappe.db.getAll({
          doctype: 'File',
          fields: ['name', 'filename', 'mimetype', 'size'],
          filters: {
            referenceDoctype: 'DiscussionBoardMessage',
            referenceName: comment.name,
          },
        })
        comment.attachments = commentAttachments
      })
      return comments
    },
  },
}
</script>
