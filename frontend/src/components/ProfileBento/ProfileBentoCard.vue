<template>
  <article
    class="group relative block h-full w-full min-w-0 overflow-hidden rounded-xl text-left outline-none transition focus:outline-none focus-visible:outline-none"
    :class="[cardChromeClass, cardShellClass, dragClass]"
    :data-profile-card-id="card.id"
    :data-size="card.size"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    @click="selectCard"
    @keydown.enter="selectCard"
    @keydown.space.prevent="selectCard"
    @pointerdown="startPointerDrag"
  >
    <div v-if="card.type === 'Blank'" class="h-full" />

    <div v-else-if="card.type === 'Text'" class="flex h-full flex-col justify-between p-3 sm:p-4">
      <div class="flex items-center gap-1.5 pb-2 text-xs font-medium text-ink-gray-5 sm:text-sm">
        {{ card.title }}
        <span v-if="card.url" class="lucide-arrow-up-right size-3.5" aria-hidden="true" />
      </div>
      <p :class="textClass">{{ textCardBody }}</p>
      <a
        v-if="!interactive && card.url"
        class="absolute inset-0"
        :href="card.url"
        target="_blank"
        rel="noreferrer"
        :aria-label="card.title"
      />
    </div>

    <div v-else-if="card.type === 'Image'" class="h-full">
      <div ref="imageFrame" :class="imageFrameClass">
        <img
          v-if="imageUrl"
          :class="imageClass"
          :src="imageUrl"
          :alt="card.title"
          :style="imageStyle"
          @load="loadImageDimensions"
        />
        <div
          v-else
          class="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-ink-gray-5 sm:p-4"
        >
          <div
            class="grid size-10 place-items-center rounded-lg border border-dashed border-outline-gray-3 bg-surface-base text-ink-gray-6"
          >
            <span class="lucide-image-plus size-5" aria-hidden="true" />
          </div>
          <div v-if="showImageEmptyCopy" class="space-y-0.5">
            <div class="text-xs font-medium text-ink-gray-7 sm:text-sm">Add image</div>
            <div class="text-xs leading-snug text-ink-gray-5 sm:text-sm">
              Upload from the edit panel
            </div>
          </div>
        </div>
        <div class="absolute inset-x-0 top-0 p-3 sm:p-4" :class="imageCaptionClass">
          <div
            class="flex items-center gap-1.5 text-xs font-medium sm:text-sm"
            :class="imageTitleClass"
          >
            {{ card.title }}
          </div>
        </div>
        <div
          v-if="repositioning && imageUrl"
          class="absolute inset-0 z-10 flex touch-none select-none items-center justify-center bg-surface-gray-9/35"
          :class="draggingImage ? 'cursor-grabbing' : 'cursor-grab'"
          @click.stop
          @pointerdown.stop="startImageReposition"
          @pointermove.stop="moveImageReposition"
          @pointerup.stop="endImageReposition"
          @pointercancel.stop="endImageReposition"
        >
          <div class="pointer-events-none text-center">
            <div class="text-sm font-medium text-ink-base sm:text-base">Drag image up or down</div>
            <div
              class="pointer-events-auto mt-3 flex items-center justify-center gap-2"
              data-image-reposition-control
              @pointerdown.stop
            >
              <Button @click.stop="saveImagePosition">Save</Button>
              <Button @click.stop="cancelImageReposition">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSize">
      <Badge>{{ card.size }}</Badge>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ProfileBentoCard } from './types'
import { Badge, Button } from 'frappe-ui'
import { getImgDimensions } from '@/utils'

const props = defineProps<{
  card: ProfileBentoCard
  selected?: boolean
  interactive?: boolean
  draggable?: boolean
  dragging?: boolean
  repositioning?: boolean
  showSize?: boolean
}>()

const emit = defineEmits<{
  cancelImageReposition: []
  pointerDown: [event: PointerEvent]
  saveImagePosition: [position: number]
  select: []
}>()

const imageGradientClassBySize: Record<ProfileBentoCard['size'], string> = {
  '1x1': 'h-16',
  '2x1': 'h-20',
  '2x2': 'h-28',
  '4x1': 'h-20',
  '4x2': 'h-32',
}

const imageFrame = ref<HTMLElement | null>(null)
const tempImagePosition = ref(50)
const draggingImage = ref(false)
const dragStartY = ref(0)
const dragStartPosition = ref(50)
const imageDimensions = ref<{ width: number; height: number; ratio: number } | null>(null)

const cardChromeClass = computed(() => {
  if (props.card.type === 'Blank') {
    if (!props.interactive) return 'border-0 ring-0 shadow-none'
    return props.selected
      ? 'border border-outline-gray-4 ring-2 ring-outline-gray-2'
      : 'border border-transparent hover:bg-surface-gray-2'
  }
  if (props.card.type === 'Image') {
    if (!imageUrl.value && !props.selected) return 'border border-outline-gray-2'
    return props.selected
      ? 'border border-outline-gray-4 ring-2 ring-outline-gray-2'
      : 'border border-transparent hover:border-outline-gray-3'
  }
  return props.selected
    ? 'border border-outline-gray-4 ring-2 ring-outline-gray-2'
    : 'border border-outline-gray-2 hover:border-outline-gray-3'
})

const cardShellClass = computed(() => {
  if (props.card.type === 'Blank') return ''
  if (props.card.type === 'Image') return ''
  return 'bg-surface-base'
})

const dragClass = computed(() => {
  if (!props.draggable) return ''
  if (props.dragging) return 'cursor-grabbing opacity-20 scale-[0.98]'
  return 'cursor-grab select-none touch-none active:cursor-grabbing'
})

const textClass = computed(() => {
  return 'text-base font-medium leading-snug text-ink-gray-9 sm:text-xl'
})

const imageFrameClass = computed(() => {
  if (imageRendering.value === 'Natural') {
    return 'relative grid h-full place-items-center bg-surface-gray-2'
  }

  return 'relative h-full'
})

const imageClass = computed(() => {
  return {
    Cover: 'h-full w-full object-cover',
    Fit: 'h-full w-full object-contain',
    Natural: 'max-h-full max-w-full object-contain',
  }[imageRendering.value]
})

const imageStyle = computed(() => {
  return {
    objectPosition: `center ${currentImagePosition.value}%`,
  }
})

const currentImagePosition = computed(() => {
  if (props.repositioning) return clampPosition(tempImagePosition.value)
  return clampPosition(props.card.imagePosition ?? 50)
})

const imageCaptionClass = computed(() => {
  if (!imageUrl.value) return ''
  if (imageRendering.value !== 'Cover') return ''
  return `bg-gradient-to-b from-surface-gray-9/70 to-transparent ${
    imageGradientClassBySize[props.card.size]
  }`
})

const imageTitleClass = computed(() => {
  if (!imageUrl.value) return 'text-ink-gray-6'
  if (imageRendering.value !== 'Cover') return 'text-ink-gray-6'
  return 'text-ink-gray-1'
})

const showImageEmptyCopy = computed(() => {
  return props.card.size !== '1x1'
})

const imageRendering = computed(() => {
  return props.card.imageRendering || 'Cover'
})

const imageUrl = computed(() => {
  return props.card.image
})

const textCardBody = computed(() => {
  return props.card.text
})

function selectCard() {
  if (!props.interactive) return
  emit('select')
}

function startPointerDrag(event: PointerEvent) {
  if (!props.draggable || event.button !== 0) return
  emit('pointerDown', event)
}

watch(
  () => [props.repositioning, props.card.imagePosition] as const,
  ([repositioning]) => {
    if (repositioning) {
      tempImagePosition.value = clampPosition(props.card.imagePosition ?? 50)
    }
  },
)

watch(
  imageUrl,
  async (url) => {
    imageDimensions.value = url ? await getImgDimensions(url) : null
  },
  { immediate: true },
)

async function loadImageDimensions() {
  if (!imageUrl.value) return
  imageDimensions.value = await getImgDimensions(imageUrl.value)
}

function startImageReposition(event: PointerEvent) {
  if (event.button !== 0 || isImageRepositionControl(event.target)) return

  let verticalOverflow = getVerticalOverflow()
  if (!verticalOverflow) return

  draggingImage.value = true
  dragStartY.value = event.clientY
  dragStartPosition.value = clampPosition(tempImagePosition.value)
  event.currentTarget.setPointerCapture(event.pointerId)
}

function isImageRepositionControl(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('[data-image-reposition-control]'))
}

function moveImageReposition(event: PointerEvent) {
  if (!draggingImage.value) return

  let verticalOverflow = getVerticalOverflow()
  if (!verticalOverflow) return

  let deltaY = dragStartY.value - event.clientY
  let deltaPosition = (deltaY * 100) / verticalOverflow
  tempImagePosition.value = clampPosition(dragStartPosition.value + deltaPosition)
}

function endImageReposition(event: PointerEvent) {
  if (!draggingImage.value) return

  draggingImage.value = false
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
}

function saveImagePosition() {
  emit('saveImagePosition', clampPosition(tempImagePosition.value))
}

function cancelImageReposition() {
  emit('cancelImageReposition')
}

function getVerticalOverflow() {
  if (!imageFrame.value) return 0

  let { width, height } = imageFrame.value.getBoundingClientRect()
  let imageRatio = getImageRatio()
  if (!imageRatio) return 0

  let imageHeight = width / imageRatio
  return Math.max(0, imageHeight - height)
}

function getImageRatio() {
  if (imageDimensions.value?.ratio) return imageDimensions.value.ratio

  let image = imageFrame.value?.querySelector('img')
  if (!image?.naturalWidth || !image.naturalHeight) return 0
  return image.naturalWidth / image.naturalHeight
}

function clampPosition(position: number) {
  return Math.min(100, Math.max(0, Number(position) || 0))
}
</script>
