declare module "bad-words" {
    export default class Filter {
      isProfane(text: string): boolean;
      clean(text: string): string;
    }
  }