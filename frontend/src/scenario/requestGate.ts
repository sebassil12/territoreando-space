export type RequestTicket = { revision: number; token: number; signal: AbortSignal }

// Version ownership protects against responses that arrive after cancellation or edits.
export class RequestGate {
  private revision = 0
  private token = 0
  private controller: AbortController | null = null
  invalidate() {
    this.controller?.abort()
    this.controller = null
    this.token += 1
    this.revision += 1
    return this.revision
  }
  begin(): RequestTicket {
    this.controller?.abort()
    this.controller = new AbortController()
    this.token += 1
    return { revision: this.revision, token: this.token, signal: this.controller.signal }
  }
  owns(ticket: RequestTicket) {
    return ticket.revision === this.revision && ticket.token === this.token && !ticket.signal.aborted
  }
}
