<template>
  <div class="min-h-full bg-surface-base">
    <div class="mx-auto flex w-full max-w-[1180px] gap-6 px-4 py-6 sm:px-6">
      <main class="min-w-0 flex-1">
        <div class="mb-4 flex items-center justify-between gap-3">
          <Button icon-left="lucide-arrow-left" variant="outline" :route="{ name: 'People' }">
            People
          </Button>
          <div class="flex shrink-0 items-center gap-2">
            <Button icon-left="lucide-eye">Preview</Button>
            <Button variant="solid" icon-left="lucide-save">Save draft</Button>
          </div>
        </div>

        <section class="grid grid-cols-4 gap-3">
          <button
            v-for="card in cards"
            :key="card.id"
            class="group relative overflow-hidden rounded-xl text-left transition"
            :class="[cardSizeClass(card.size), cardChromeClass(card), cardShellClass(card)]"
            @click="selectedCardId = card.id"
          >
            <TextCard v-if="card.type === 'text'" :card="card" />
            <ImageCard v-else-if="card.type === 'image'" :card="card" />
            <GalleryCard v-else-if="card.type === 'gallery'" :card="card" />
            <FocusCard v-else-if="card.type === 'focus'" :card="card" />
            <LinksCard v-else :card="card" />
            <div
              class="absolute right-2 top-2 hidden rounded-md border border-outline-gray-2 bg-surface-base/90 px-2 py-1 text-xs text-ink-gray-6 shadow-sm group-hover:block"
            >
              {{ card.size }}
            </div>
          </button>
        </section>
      </main>

      <aside class="hidden w-[320px] shrink-0 lg:block">
        <div class="sticky top-5 space-y-4">
          <div class="rounded-lg border border-outline-gray-2 bg-surface-base p-3 shadow-sm">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-medium text-ink-gray-9">Cards</h2>
              <span class="text-sm text-ink-gray-5">{{ cards.length }} blocks</span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <Button
                v-for="option in cardTypeOptions"
                :key="option.type"
                :icon-left="option.icon"
                @click="addCard(option.type)"
              >
                {{ option.label }}
              </Button>
            </div>
          </div>

          <div
            v-if="selectedCard"
            class="rounded-lg border border-outline-gray-2 bg-surface-base p-3 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-medium text-ink-gray-9">Edit selected</h2>
                <p class="mt-1 text-sm text-ink-gray-5">{{ selectedCard.type }} card</p>
              </div>
              <Button icon="lucide-trash-2" @click="removeSelectedCard" />
            </div>

            <div class="mt-4 space-y-3">
              <FormControl label="Title" v-model="selectedCard.title" />
              <FormControl
                v-if="selectedCard.type === 'text' || selectedCard.type === 'focus'"
                label="Text"
                type="textarea"
                :rows="4"
                :model-value="selectedCard.text"
                @update:model-value="(value) => updateSelectedText(value)"
              >
                <template #suffix>
                  <span class="text-sm text-ink-gray-5">
                    {{ selectedTextCharactersLeft }}
                  </span>
                </template>
              </FormControl>

              <div>
                <div class="mb-1.5 text-sm text-ink-gray-6">Size</div>
                <TabButtons
                  :buttons="[
                    { label: '1x1' },
                    { label: '2x1' },
                    { label: '2x2' },
                    { label: '4x1' },
                    { label: '4x2' },
                  ]"
                  v-model="selectedCard.size"
                />
              </div>

              <div
                v-if="selectedCard.type === 'image' || selectedCard.type === 'gallery'"
                class="rounded-lg border border-dashed border-outline-gray-2 p-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium text-ink-gray-8">Image slot</div>
                    <div class="mt-1 text-sm text-ink-gray-5">Mock upload state</div>
                  </div>
                  <Button icon-left="lucide-upload">Upload</Button>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-outline-gray-2 bg-surface-base p-3 shadow-sm">
            <h2 class="text-base font-medium text-ink-gray-9">Layout feel</h2>
            <div class="mt-3">
              <TabButtons :buttons="densityOptions" v-model="density" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Button, FormControl, TabButtons, usePageMeta } from 'frappe-ui'

type CardType = 'text' | 'image' | 'gallery' | 'focus' | 'links'
type CardSize = '1x1' | '2x1' | '2x2' | '4x1' | '4x2'

interface BentoCard {
  id: string
  type: CardType
  size: CardSize
  title: string
  text?: string
  image?: string
  images?: string[]
  links?: string[]
}

const cardTypeOptions: Array<{ type: CardType; label: string; icon: string }> = [
  { type: 'text', label: 'Text', icon: 'lucide-text' },
  { type: 'image', label: 'Image', icon: 'lucide-image' },
  { type: 'gallery', label: 'Gallery', icon: 'lucide-images' },
  { type: 'focus', label: 'Focus', icon: 'lucide-sparkles' },
  { type: 'links', label: 'Links', icon: 'lucide-link' },
]

const densityOptions = [{ label: 'Airy' }, { label: 'Dense' }]
const density = ref('Airy')
const selectedCardId = ref('cover')

const cards = reactive<BentoCard[]>([
  {
    id: 'cover',
    type: 'image',
    size: '4x1',
    title: 'Cover image',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'avatar',
    type: 'image',
    size: '1x1',
    title: 'Avatar',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'full-name',
    type: 'text',
    size: '2x1',
    title: 'Full name',
    text: 'Faris Ansari',
  },
  {
    id: 'bio',
    type: 'text',
    size: '2x1',
    title: 'Bio',
    text: 'Product builder, design systems obsessive, and collector of tiny interface details.',
  },
  {
    id: 'intro',
    type: 'text',
    size: '2x1',
    title: 'Small joys',
    text: 'I like building interfaces that feel calm at first and quietly powerful after the tenth use.',
  },
  {
    id: 'desk',
    type: 'image',
    size: '1x1',
    title: 'Desk mood',
    image:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'gallery',
    type: 'gallery',
    size: '2x2',
    title: 'Outside work',
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    id: 'focus',
    type: 'focus',
    size: '1x1',
    title: 'This month',
    text: 'Rethinking profiles as personal homepages for remote teams.',
  },
  {
    id: 'links',
    type: 'links',
    size: '1x1',
    title: 'Find me',
    links: ['Website', 'Calendar', 'Design notes'],
  },
  {
    id: 'quote',
    type: 'text',
    size: '2x1',
    title: 'Working style',
    text: 'Async first. Sharp docs. Prototype before debating the abstract version too long.',
  },
])

const selectedCard = computed(() => {
  return cards.find((card) => card.id === selectedCardId.value)
})

const selectedTextCharactersLeft = computed(() => {
  return 140 - (selectedCard.value?.text?.length || 0)
})

function addCard(type: CardType) {
  let card = createCard(type)
  cards.push(card)
  selectedCardId.value = card.id
}

function removeSelectedCard() {
  let index = cards.findIndex((card) => card.id === selectedCardId.value)
  if (index === -1) return

  cards.splice(index, 1)
  selectedCardId.value = cards[Math.max(0, index - 1)]?.id || ''
}

function updateSelectedText(value: string) {
  if (!selectedCard.value) return
  selectedCard.value.text = value.slice(0, 140)
}

function createCard(type: CardType): BentoCard {
  let id = `${type}-${Date.now()}`
  if (type === 'image') {
    return {
      id,
      type,
      size: '1x1',
      title: 'New image',
      image:
        'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=700&q=80',
    }
  }
  if (type === 'gallery') {
    return {
      id,
      type,
      size: '2x2',
      title: 'New gallery',
      images: [
        'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=700&q=80',
      ],
    }
  }
  if (type === 'links') {
    return {
      id,
      type,
      size: '1x1',
      title: 'New links',
      links: ['Portfolio', 'Now page'],
    }
  }
  return {
    id,
    type,
    size: type === 'text' ? '2x1' : '1x1',
    title: type === 'focus' ? 'Current focus' : 'New note',
    text: type === 'focus' ? 'What I am exploring right now.' : 'A short thought for this card.',
  }
}

function cardSizeClass(size: CardSize) {
  return {
    '1x1': 'col-span-4 aspect-square sm:col-span-1',
    '2x1': 'col-span-4 aspect-[2/1] sm:col-span-2',
    '2x2': 'col-span-4 aspect-square sm:col-span-2',
    '4x1': 'col-span-4 aspect-[4/1]',
    '4x2': 'col-span-4 aspect-[2/1]',
  }[size]
}

function cardChromeClass(card: BentoCard) {
  let isSelected = selectedCardId.value === card.id
  if (card.type === 'image' || card.type === 'gallery') {
    return isSelected
      ? 'ring-2 ring-inset ring-surface-base/80'
      : 'ring-1 ring-inset ring-surface-base/40 hover:ring-surface-base/70'
  }
  return isSelected
    ? 'border border-outline-gray-4 ring-2 ring-outline-gray-2'
    : 'border border-outline-gray-2 hover:border-outline-gray-3'
}

function cardShellClass(card: BentoCard) {
  if (card.type === 'image' || card.type === 'gallery') return 'bg-surface-gray-2'
  if (card.type === 'focus') return 'bg-surface-gray-3'
  return 'bg-surface-base'
}

usePageMeta(() => {
  return {
    title: 'Customize Profile | Gameplan',
  }
})
</script>

<script lang="ts">
import { defineComponent, h, type PropType } from 'vue'

const TextCard = defineComponent({
  name: 'TextCard',
  props: {
    card: {
      type: Object as PropType<BentoCard>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h('div', { class: 'flex h-full flex-col justify-between p-4' }, [
        h('div', { class: 'text-sm font-medium text-ink-gray-5' }, props.card.title),
        h(
          'p',
          {
            class:
              props.card.id === 'full-name'
                ? 'text-4xl font-semibold leading-tight text-ink-gray-9'
                : props.card.id === 'bio'
                  ? 'text-lg font-medium leading-snug text-ink-gray-8'
                  : 'text-xl font-semibold leading-snug text-ink-gray-9',
          },
          props.card.text,
        ),
      ])
  },
})

const ImageCard = defineComponent({
  name: 'ImageCard',
  props: {
    card: {
      type: Object as PropType<BentoCard>,
      required: true,
    },
  },
  setup(props) {
    if (props.card.id === 'avatar') {
      return () =>
        h('div', { class: 'grid h-full place-items-center bg-surface-base p-4' }, [
          h('img', {
            class: 'h-24 w-24 rounded-full border-4 border-outline-base object-cover shadow-sm',
            src: props.card.image,
            alt: props.card.title,
          }),
        ])
    }

    return () =>
      h('div', { class: 'relative h-full' }, [
        h('img', {
          class: 'h-full w-full object-cover',
          src: props.card.image,
          alt: props.card.title,
        }),
        h(
          'div',
          {
            class:
              'absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-gray-9/70 to-transparent p-3',
          },
          h('div', { class: 'text-sm font-medium text-ink-gray-1' }, props.card.title),
        ),
      ])
  },
})

const GalleryCard = defineComponent({
  name: 'GalleryCard',
  props: {
    card: {
      type: Object as PropType<BentoCard>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h('div', { class: 'grid h-full grid-cols-2 grid-rows-2 gap-1 p-1' }, [
        ...(props.card.images || []).slice(0, 4).map((image, index) =>
          h('img', {
            class: ['h-full w-full object-cover', index === 0 ? 'rounded-tl-md' : ''].join(' '),
            src: image,
            alt: `${props.card.title} ${index + 1}`,
          }),
        ),
        h(
          'div',
          {
            class:
              'absolute bottom-3 left-3 rounded-md bg-surface-base/85 px-2 py-1 text-sm font-medium text-ink-gray-8 backdrop-blur-md',
          },
          props.card.title,
        ),
      ])
  },
})

const FocusCard = defineComponent({
  name: 'FocusCard',
  props: {
    card: {
      type: Object as PropType<BentoCard>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h('div', { class: 'flex h-full flex-col justify-between p-4' }, [
        h('span', { class: 'lucide-sparkles size-5 text-ink-gray-6' }),
        h('div', [
          h('div', { class: 'text-sm font-medium text-ink-gray-6' }, props.card.title),
          h(
            'p',
            { class: 'mt-1 text-base font-medium leading-snug text-ink-gray-9' },
            props.card.text,
          ),
        ]),
      ])
  },
})

const LinksCard = defineComponent({
  name: 'LinksCard',
  props: {
    card: {
      type: Object as PropType<BentoCard>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h('div', { class: 'p-4' }, [
        h('div', { class: 'text-sm font-medium text-ink-gray-5' }, props.card.title),
        h(
          'div',
          { class: 'mt-3 space-y-2' },
          (props.card.links || []).map((link) =>
            h('div', { class: 'flex items-center justify-between text-base text-ink-gray-8' }, [
              h('span', link),
              h('span', { class: 'lucide-arrow-up-right size-4 text-ink-gray-5' }),
            ]),
          ),
        ),
      ])
  },
})
</script>
