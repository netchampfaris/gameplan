<template>
  <div class="discussion">
    <back-to-discussions></back-to-discussions>
    <div v-if="discussion">
      <discussion-post :post="discussion" :is-original-post="true"></discussion-post>
      <discussion-post :post="discussion"></discussion-post>
      <create-discussion-post :post="userPost" is-comment></create-discussion-post>
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
      userPost: {
        content: '',
        owner: frappe.session ? frappe.session.fullName : 'Guest',
      },
    };
  },
  async beforeCreate() {
    const name = this.$route.params.name;
    const discussion = await frappe.getDoc('DiscussionBoard', name);
    this.discussion = discussion;
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
