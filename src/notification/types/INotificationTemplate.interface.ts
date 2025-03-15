export interface INotificationTemplate {
  render(params: Record<string, any>): string;
  getName(): string;
}
