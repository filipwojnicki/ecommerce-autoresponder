export interface INotificationProvider {
  send(message: string, tags?: string[]): Promise<boolean>;
  getName(): string;
}
