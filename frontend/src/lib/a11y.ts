export const MAIN_CONTENT_ID = 'main-content'

export function handleRadioGroupKeyDown(event: React.KeyboardEvent<HTMLElement>) {
  const radios = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'),
  )
  if (radios.length === 0) return

  const activeIndex = radios.findIndex((radio) => radio === document.activeElement)
  if (activeIndex === -1) return

  let nextIndex = activeIndex
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    nextIndex = (activeIndex + 1) % radios.length
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    nextIndex = (activeIndex - 1 + radios.length) % radios.length
  } else {
    return
  }

  event.preventDefault()
  radios[nextIndex]?.focus()
}
