const HOME_VIEW_PATH = 'home/home'

export const homeGetController = {
  handler (_request, h) {
    return h.view(HOME_VIEW_PATH)
  }
}
