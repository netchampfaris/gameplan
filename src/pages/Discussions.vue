<template>
  <div class="page-discussions">
    <search-box />
    <g-row class="new-discussion">
      <input
        type="text"
        placeholder="Start a discussion..."
        @click="startDiscussion"
      />
    </g-row>
    <div class="discussion-list">
      <g-row
        padding="2"
        class="discussion-row"
        v-for="discussion of discussionList"
        v-bind:key="discussion.name"
        @click.native="openDiscussion(discussion.name)"
      >
        <span class="discussion-row-time" slot="left">{{
          discussion.modified | timeRelative
        }}</span>
        <div>{{ discussion.title }}</div>
        <feather-icon
          slot="right"
          name="paperclip"
          v-if="discussion.attachments"
        />
      </g-row>
    </div>
  </div>
</template>

<script>
import frappe from 'frappejs'
import { distanceInWordsStrict } from 'date-fns'
import SearchBox from '@/components/SearchBox'
import Indicator from '@/components/Indicator'

export default {
  name: 'Discussions',
  data() {
    return {
      discussionList: [],
    }
  },
  components: {
    SearchBox,
    Indicator,
  },
  mounted() {
    this.fetchDiscussions()
    // frappe.db.on('change:DiscussionBoard', async ({ name }) => {
    //   const newDiscussion = await this.getDiscussions({ name })[0];

    //   let found = false;
    //   for (let discussion of this.discussionList) {
    //     if (discussion.name === name) {
    //       Object.assign(discussion, newDiscussion);
    //       found = true;
    //     }
    //   }
    //   if (!found) {
    //     this.discussionList = [newDiscussion, ...this.discussionList];
    //   }
    // });
  },
  methods: {
    async fetchDiscussions() {
      this.discussionList = await this.getDiscussions()
    },
    async getDiscussions(filters) {
      return await frappe.db.getAll({
        doctype: 'DiscussionBoard',
        fields: [
          'name',
          'title',
          'creation',
          'modified',
          'owner',
          'attachments',
        ],
        orderBy: 'modified',
        order: 'desc',
        filters: filters || null,
      })
    },
    startDiscussion() {
      this.$router.push('start-a-discussion')
    },
    openDiscussion(name) {
      this.$router.push(`/discussion/${name}`)
    },
  },
  filters: {
    timeRelative(timestamp) {
      const parts = distanceInWordsStrict(timestamp, new Date()).split(' ')
      return parts[0] + parts[1][0]
    },
  },
}
</script>

<style scoped>
.new-discussion input {
  cursor: pointer;
}

.discussion-list {
  padding-top: 1rem;
}

.discussion-row {
  font-size: 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
}

.discussion-row:hover {
  background-color: #fff;
}

.discussion-row-time {
  color: var(--text-grey);
}
</style>
