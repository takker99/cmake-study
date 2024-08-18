export class ExitStatus extends Error {
  name = "ExitStatus";
  constructor(public status: number) {
    super(`Program terminated with exit(${status})`);
  }
}
