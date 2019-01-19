<template>
  <div class="start-discussion">
    <back-to-discussions></back-to-discussions>
    <create-discussion-post
      :post="post"
      :is-original-post="true"
      v-on:post-value="newDiscussion"
    >
    </create-discussion-post>
  </div>
</template>

<script>
import frappe from 'frappejs'
import CreateDiscussionPost from '@/components/CreateDiscussionPost'
import BackToDiscussions from '@/components/BackToDiscussions'

export default {
  name: 'StartDiscussion',
  components: {
    BackToDiscussions,
    CreateDiscussionPost,
  },
  data() {
    return {
      post: {
        title: '',
        content: '',
        owner: frappe.session ? frappe.session.fullName : 'Guest',
      },
    }
  },
  methods: {
    async newDiscussion(title, content, attachments) {
      if (title && content) {
        const doc = frappe.newDoc({
          doctype: 'DiscussionBoard',
          title,
          content,
          attachments,
          creation: new Date().toISOString(),
          owner: frappe.session.user,
          modifiedBy: frappe.session.user,
        })

        await doc.insert()

        this.$router.push(`/discussion/${doc.name}`)
      }
    },
  },
}
</script>
