const HOME_VIEW_PATH = 'home/home'

export const homeGetController = {
  handler (request, h) {
    return h.view(HOME_VIEW_PATH)
  }
}
