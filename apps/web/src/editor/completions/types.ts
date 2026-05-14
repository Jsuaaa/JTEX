export interface CommandDef {
  name: string;
  template?: string;
  detail?: string;
  info?: string;
}

export interface EnvironmentDef {
  name: string;
  template?: string;
  detail?: string;
}

export interface SnippetDef {
  label: string;
  template: string;
  detail?: string;
}

export interface LabelDef {
  name: string;
  file: string;
  line: number;
}

export interface LocalCommandDef {
  name: string;
  args: number;
  file: string;
  line: number;
}

export interface BibEntry {
  key: string;
  type: string;
  title?: string;
  author?: string;
  year?: string;
}
