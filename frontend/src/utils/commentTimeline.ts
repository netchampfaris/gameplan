interface TimelineItemWithDoctype {
  doctype?: string
}

export function needsMobileCommentGap(
  timelineItems: TimelineItemWithDoctype[],
  index: number,
  options: { includeFirstComment?: boolean } = {},
) {
  const item = timelineItems[index]
  if (item?.doctype !== 'GP Comment') return false

  return Boolean(
    (options.includeFirstComment && index === 0) ||
    timelineItems[index - 1]?.doctype === 'GP Comment',
  )
}
