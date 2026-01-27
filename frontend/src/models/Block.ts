export type BlockType =
  | "dataset"
  | "split"
  | "feature_pipeline"
  | "model"
  | "trainer"
  | "metrics";

export interface Block {
  id: string;
  type: BlockType;
  params: Record<string, any>;
}
