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
        <span slot="info-left">{{ discussion.modified | timeRelative }}</span>
        {{ discussion.title }}
        <feather-icon v-if="discussion.attachments" slot="info-right" name="paperclip" />
      </discussion-row>
    </div>
  </div>
</template>

<script>
import frappe from 'frappejs';
import { parse, distanceInWordsStrict } from 'date-fns';
import SearchBox from '@/components/SearchBox';
import DiscussionRow from '@/components/DiscussionRow';
import Indicator from '@/components/Indicator';
import FeatherIcon from 'frappejs/ui/components/FeatherIcon';

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
    FeatherIcon,
    Indicator
  },
  mounted() {
    this.fetchDiscussions();
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
      this.discussionList = await this.getDiscussions();
    },
    async getDiscussions(filters) {
      return await frappe.db.getAll({
        doctype: 'DiscussionBoard',
        fields: ['name', 'title', 'creation', 'modified', 'owner', 'attachments'],
        orderBy: 'modified',
        order: 'desc',
        filters: filters || null,
      });
    },
    startDiscussion() {
      this.$router.push('start-a-discussion');
    },
    openDiscussion(name) {
      this.$router.push(`discussion/${name}`);
    }
  },
  filters: {
    timeRelative(timestamp) {
      const parts = distanceInWordsStrict(timestamp, new Date()).split(' ');
      return parts[0] + parts[1][0];
    }
  }
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
