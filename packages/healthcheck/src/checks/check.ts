export interface Check {
  name: string;
  test(): Promise<void>;
}
