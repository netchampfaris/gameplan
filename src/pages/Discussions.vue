<template>
  <div class="discussion">
    <search-box></search-box>
    <div class="start-a-discussion">
      <input type="text" placeholder="Start a discussion..." @click.prevent="startDiscussion">
    </div>
    <div class="discussion-row-list">
      <discussion-row
        v-for="discussion of discussionList"
        v-bind:key="discussion.name"
        @click.native="openDiscussion(discussion.name)"
      >
        {{ discussion.title }}
      </discussion-row>
    </div>
  </div>
</template>

<script>
import frappe from 'frappejs';
import SearchBox from '@/components/SearchBox';
import DiscussionRow from '@/components/DiscussionRow';

export default {
  name: 'Discussions',
  data() {
    return {
      discussionList: [],
    };
  },
  components: {
    SearchBox,
    DiscussionRow,
  },
  async beforeCreate() {
    const discussionList = await frappe.db.getAll({
      doctype: 'DiscussionBoard',
      fields: ['name', 'title', 'creation', 'modified', 'owner'],
      orderBy: 'modified',
      order: 'desc',
    });

    this.discussionList = discussionList;
  },
  methods: {
    startDiscussion() {
      this.$router.push('start-a-discussion');
    },
    openDiscussion(name) {
      this.$router.push(`discussion/${name}`);
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

.start-a-discussion {
  padding: 1rem;
  padding-left: 3rem;
}

.start-a-discussion input {
  cursor: pointer;
}

.discussion-row-list {
  padding-top: 1rem;
}
</style>
