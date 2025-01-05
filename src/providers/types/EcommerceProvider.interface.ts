export interface IEcommerceProvider {
  getName();
  supports(provider: string): boolean;
}
