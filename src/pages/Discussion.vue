<template>
  <div class="discussion">
    <back-to-discussions></back-to-discussions>
    <div v-if="discussion">
      <discussion-post :post="discussion" :is-original-post="true"></discussion-post>
      <discussion-post
        v-for="comment of comments" :post="comment"
        v-bind:key="comment.name"
      ></discussion-post>
      <create-discussion-post
        :post="userPost" :inactive="!addCommentActive"
        v-on:post-value="addComment"
      ></create-discussion-post>
    </div>
  </div>
</template>

<script>
import frappe from 'frappejs';
import BackToDiscussions from '@/components/BackToDiscussions';
import DiscussionPost from '@/components/DiscussionPost';
import CreateDiscussionPost from '@/components/CreateDiscussionPost';

export default {
  name: 'Discussion',
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
    };
  },
  async beforeCreate() {
    const name = this.$route.params.name;
    const discussion = await frappe.getDoc('DiscussionBoard', name);
    this.discussion = discussion;

    const comments = await frappe.db.getAll({
      doctype: 'DiscussionBoardMessage',
      fields: ['name', 'content', 'owner', 'creation', 'modified'],
      filters: {
        discussionBoard: this.discussion.name,
      },
      orderBy: 'creation',
      order: 'asc',
    });
    this.comments = comments;
  },
  methods: {
    async addComment(title, content) {
      const doc = frappe.newDoc({
        doctype: 'DiscussionBoardMessage',
        creation: new Date().toISOString(),
        owner: frappe.session.user,
        discussionBoard: this.discussion.name,
        content,
      });

      await doc.insert();
      this.comments.push(doc);
      this.addCommentActive = false;
    },
  },
};
</script>

<style scoped>
.discussion {
  max-width: 60%;
  margin: 0 auto;
  padding-top: 2rem;
}
</style>
