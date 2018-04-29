<template>
  <div class="discussion">
    <search-box></search-box>
    <div class="start-a-discussion">
      <input type="text" placeholder="Start a discussion..." @click.prevent="startDiscussion">
    </div>
    <div class="discussion-row-list">
      <discussion-row>
        Sukh We’re out of coffee!
      </discussion-row>
      <discussion-row>
        Tee photo shoot and video in Tirupur. More good locations?
      </discussion-row>
    </div>
  </div>
</template>

<script>
import SearchBox from '@/components/SearchBox';
import DiscussionRow from '@/components/DiscussionRow';

export default {
  name: 'Discussions',
  methods: {
    startDiscussion() {
      this.$router.push('start-a-discussion');
    },
  },
  components: {
    SearchBox,
    DiscussionRow,
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
