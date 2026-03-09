class ErrorSummaryModel {
  /**
   * @param {Object} params
   * @param {string|null} [params.errorMessage]
   */
  constructor ({ errorMessage = null }) {
    this.errorMessage = errorMessage
  }
}

export { ErrorSummaryModel }
