export interface Check {
  name: string;
  test(): Promise<void>;
  /**
   * If false, a failed check will not cause the overall healthcheck to fail (503).
   * The check will still be reported as 'down' but won't block deployment.
   * @default true
   */
  critical?: boolean;
}
