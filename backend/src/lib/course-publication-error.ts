export class CoursePublicationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Course cannot be published. ${issues.join(" ")}`)
    this.name = "CoursePublicationError"
  }
}
