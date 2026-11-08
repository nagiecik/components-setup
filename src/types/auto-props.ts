export interface TargetPropDef {
  name: string;
  group: 3 | 4 | 5 | 6;
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'SLOT';
  defaultValue?: boolean | string;
  preferredValues?: any[];
  representativeNode: SceneNode | null;
  bindings: Array<{ node: SceneNode; refType: 'visible' | 'characters' | 'mainComponent' | 'slot' }>;
}

export interface AutoPropsOptions {
  enableText?: boolean;
  enableInstanceSwap?: boolean;
  enableBoolean?: boolean;
  enableSlotExtract?: boolean;
  enableTextVisibility?: boolean;
  enableNestedInstances?: boolean;
  disabledInstanceSwapNames?: string[];
  disabledTextNames?: string[];
  instanceSwapDecisions?: Record<string, boolean>;
  textVisibilityDecisions?: Record<string, boolean>;
  nestedInstanceDecisions?: Record<string, boolean>;
}

