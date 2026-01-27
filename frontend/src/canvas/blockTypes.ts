export const BLOCK_DEFINITIONS = {
  dataset: {
    label: "Dataset",
    defaultParams: {
      file_path: "",
      target: ""
    }
  },
  split: {
    label: "Train/Test Split",
    defaultParams: {
      test_size: 0.2,
      stratify: true
    }
  },
  feature_pipeline: {
    label: "Feature Pipeline",
    defaultParams: {}
  },
  model: {
    label: "Model",
    defaultParams: {
      task: "classification",
      hyperparams: {
        n_estimators: 100,
        max_depth: 10
      }
    }
  },
  trainer: {
    label: "Trainer",
    defaultParams: {}
  },
  metrics: {
    label: "Metrics",
    defaultParams: {}
  }
};
