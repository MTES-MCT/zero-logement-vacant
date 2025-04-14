export interface Metabase {
    fetchMetabaseData(questionId: number, userId: string): Promise<[] | undefined>;
}