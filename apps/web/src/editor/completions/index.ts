import type { Extension } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { latexSource } from './source';
import { autoCloseEnv } from './auto-close-env';

export function latexCompletions(): Extension {
  return [
    autocompletion({
      override: [latexSource],
      activateOnTyping: true,
      defaultKeymap: false,
    }),
    autoCloseEnv(),
  ];
}
