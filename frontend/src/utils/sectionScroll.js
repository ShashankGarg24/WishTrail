export function scrollToSection(event, sectionId) {
  if (
    event?.button > 0 ||
    event?.metaKey ||
    event?.ctrlKey ||
    event?.shiftKey ||
    event?.altKey
  ) {
    return
  }

  const section = document.getElementById(sectionId)
  if (!section) return

  event?.preventDefault()
  const header = document.querySelector('.wt-header')
  const headerHeight = header?.getBoundingClientRect().height || 0
  const top = Math.max(
    0,
    window.scrollY + section.getBoundingClientRect().top - headerHeight - 16,
  )
  const hash = `#${sectionId}`

  if (window.location.hash !== hash) {
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${hash}`,
    )
  }

  window.scrollTo({
    top,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
}
