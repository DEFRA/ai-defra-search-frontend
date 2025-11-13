export const startGetController = {
  handler (_request, h) {
    return h.view('start/start')
  }
}

export const startPostController = {
  handler (request, h) {
    const { question } = request.payload

    // Log the question for verification
    request.logger.info({ question }, 'Question submitted')

    // For now, just redirect back to the form
    return h.redirect('/start')
  }
}
