const ACCESSIBILITY_VIEW_PATH = 'accessibility/accessibility'

export const accessibilityGetController = {
  handler (_request, h) {
    return h.view(ACCESSIBILITY_VIEW_PATH)
  }
}
